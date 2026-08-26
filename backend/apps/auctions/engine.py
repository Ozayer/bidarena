import random
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.db.models import Q
from django.utils import timezone

from apps.players.models import Player
from apps.tournaments.models import BidIncrementRule

from .models import AuctionEvent, AuctionSession, Bid

DEFAULT_INCREMENT = Decimal('10')


class EngineError(Exception):
    """Raised for any invalid auction action — the view layer turns this into a 400."""


def _log_event(session, event_type, actor=None, player=None, detail=None):
    AuctionEvent.objects.create(
        tournament=session.tournament,
        player=player,
        event_type=event_type,
        actor=actor,
        detail=detail or {},
    )


def _next_increment(tournament, current_amount):
    rule = (
        BidIncrementRule.objects.filter(tournament=tournament, from_amount__lte=current_amount)
        .filter(Q(to_amount__isnull=True) | Q(to_amount__gt=current_amount))
        .order_by('-from_amount')
        .first()
    )
    return rule.increment_amount if rule else DEFAULT_INCREMENT


def get_or_create_session(tournament):
    session, _ = AuctionSession.objects.get_or_create(tournament=tournament)
    return session


def start_auction(tournament, actor=None):
    session = get_or_create_session(tournament)
    if session.status == AuctionSession.Status.LIVE:
        raise EngineError('Auction is already live.')
    session.status = AuctionSession.Status.LIVE
    if not session.started_at:
        session.started_at = timezone.now()
    session.save()
    return session


def start_next_player(session, pool=None, actor=None):
    if session.status != AuctionSession.Status.LIVE:
        raise EngineError('Auction must be live to start the next player.')
    if session.current_player_id:
        raise EngineError('Finish bidding on the current player before starting the next one.')

    target_pool = pool or session.active_pool
    if not target_pool:
        raise EngineError('No active pool selected.')

    # Normal-priority players first; only dip into the low-priority (returned
    # unsold) group once everyone else in the pool has been auctioned.
    candidates = list(
        Player.objects.filter(pool=target_pool, status=Player.Status.POOLED, low_priority=False)
    )
    if not candidates:
        candidates = list(
            Player.objects.filter(pool=target_pool, status=Player.Status.POOLED, low_priority=True)
        )
    if not candidates:
        raise EngineError('No available players left in this pool.')

    player = random.choice(candidates)
    player.status = Player.Status.IN_AUCTION
    player.low_priority = False
    player.save(update_fields=['status', 'low_priority'])

    session.active_pool = target_pool
    session.current_player = player
    session.current_highest_bid = None
    session.current_highest_team = None
    session.timer_ends_at = timezone.now() + timedelta(seconds=session.tournament.bid_timer_seconds)
    session.timer_paused_remaining_seconds = None
    session.save()

    _log_event(session, AuctionEvent.EventType.PLAYER_STARTED, actor=actor, player=player)
    return session


def place_bid(session, team, actor=None, amount=None):
    if session.status != AuctionSession.Status.LIVE:
        raise EngineError('Bidding is not currently open.')
    if not session.current_player_id:
        raise EngineError('No player is currently up for bidding.')
    if team.tournament_id != session.tournament_id:
        raise EngineError('Team does not belong to this tournament.')
    if session.current_highest_team_id == team.id:
        raise EngineError('This team already holds the highest bid.')

    player = session.current_player
    tournament = session.tournament

    cooldown_seconds = tournament.bid_cooldown_seconds
    if session.current_highest_bid is not None and cooldown_seconds > 0:
        last_bid = (
            Bid.objects.filter(tournament=tournament, player=player).order_by('-placed_at').first()
        )
        if last_bid:
            elapsed = (timezone.now() - last_bid.placed_at).total_seconds()
            if elapsed < cooldown_seconds:
                wait = round(cooldown_seconds - elapsed, 1)
                raise EngineError(
                    f'Please wait {wait}s before the next bid so everyone can see the current price.'
                )

    if session.current_highest_bid is None:
        minimum_amount = player.base_price
    else:
        minimum_amount = session.current_highest_bid + _next_increment(tournament, session.current_highest_bid)

    if amount is None:
        amount = minimum_amount
    else:
        try:
            amount = Decimal(str(amount)).quantize(Decimal('0.01'))
        except (InvalidOperation, TypeError, ValueError):
            raise EngineError('Invalid bid amount.')
        if amount < minimum_amount:
            raise EngineError(f'Bid must be at least {minimum_amount} (the minimum next bid).')

    squad_after = team.squad_size + 1
    remaining_required_after = max(tournament.players_per_team_min - squad_after, 0)
    budget_after = team.budget_remaining - amount
    if remaining_required_after > 0:
        # Reserve enough to actually buy the rest of the squad, not just $1/slot —
        # use the cheapest still-purchasable player's base price as the per-slot floor,
        # since base prices aren't necessarily uniform (and this stays correct if they change).
        cheapest_remaining = (
            Player.objects.filter(tournament=tournament)
            .exclude(status=Player.Status.SOLD)
            .exclude(id=player.id)
            .order_by('base_price')
            .values_list('base_price', flat=True)
            .first()
        )
        required_reserve = remaining_required_after * (cheapest_remaining or Decimal('0'))
    else:
        required_reserve = Decimal('0')
    if budget_after < required_reserve:
        raise EngineError(
            f"This bid would leave the team unable to afford its remaining "
            f"{remaining_required_after} required player(s) "
            f"(at least {required_reserve} needed, {budget_after} would be left)."
        )

    Bid.objects.create(tournament=tournament, player=player, team=team, amount=amount, placed_by=actor)

    session.current_highest_bid = amount
    session.current_highest_team = team
    session.timer_ends_at = timezone.now() + timedelta(seconds=tournament.bid_timer_seconds)
    session.save()
    return session


def pause(session, actor=None):
    if session.status != AuctionSession.Status.LIVE:
        raise EngineError('Auction is not live.')
    remaining = 0
    if session.timer_ends_at:
        remaining = max(int((session.timer_ends_at - timezone.now()).total_seconds()), 0)
    session.status = AuctionSession.Status.PAUSED
    session.timer_paused_remaining_seconds = remaining
    session.save()
    _log_event(session, AuctionEvent.EventType.PAUSED, actor=actor, player=session.current_player)
    return session


def resume(session, actor=None):
    if session.status != AuctionSession.Status.PAUSED:
        raise EngineError('Auction is not paused.')
    remaining = session.timer_paused_remaining_seconds or 0
    session.status = AuctionSession.Status.LIVE
    session.timer_ends_at = timezone.now() + timedelta(seconds=remaining)
    session.timer_paused_remaining_seconds = None
    session.save()
    _log_event(session, AuctionEvent.EventType.RESUMED, actor=actor, player=session.current_player)
    return session


def extend_timer(session, seconds=None, actor=None):
    seconds = seconds or session.tournament.bid_timer_extend_seconds
    if session.status == AuctionSession.Status.PAUSED:
        session.timer_paused_remaining_seconds = (session.timer_paused_remaining_seconds or 0) + seconds
    elif session.status == AuctionSession.Status.LIVE and session.timer_ends_at:
        session.timer_ends_at = session.timer_ends_at + timedelta(seconds=seconds)
    else:
        raise EngineError('No active timer to extend.')
    session.save()
    _log_event(
        session, AuctionEvent.EventType.TIMER_EXTENDED, actor=actor,
        player=session.current_player, detail={'seconds': seconds},
    )
    return session


def _clear_current_player(session):
    session.current_player = None
    session.current_highest_bid = None
    session.current_highest_team = None
    session.timer_ends_at = None
    session.timer_paused_remaining_seconds = None


def mark_sold(session, actor=None):
    if not session.current_player_id:
        raise EngineError('No player is currently up for bidding.')
    if not session.current_highest_team_id:
        raise EngineError('No bids have been placed — mark unsold instead.')

    player = session.current_player
    team = session.current_highest_team
    amount = session.current_highest_bid

    player.status = Player.Status.SOLD
    player.team = team
    player.sold_price = amount
    player.pool = None
    player.save()

    _log_event(
        session, AuctionEvent.EventType.SOLD, actor=actor, player=player,
        detail={'team_id': team.id, 'team_name': team.name, 'amount': str(amount)},
    )

    _clear_current_player(session)
    session.save()
    return session


def mark_unsold(session, actor=None):
    if not session.current_player_id:
        raise EngineError('No player is currently up for bidding.')

    player = session.current_player
    player.status = Player.Status.UNSOLD
    player.low_priority = False
    player.save()

    _log_event(session, AuctionEvent.EventType.UNSOLD, actor=actor, player=player)

    _clear_current_player(session)
    session.save()
    return session


def undo_last_bid(session, actor=None):
    if not session.current_player_id:
        raise EngineError('No player is currently up for bidding.')

    last_bid = (
        Bid.objects.filter(tournament=session.tournament, player=session.current_player)
        .order_by('-placed_at')
        .first()
    )
    if not last_bid:
        raise EngineError('No bids to undo.')

    detail = {'amount': str(last_bid.amount), 'team_id': last_bid.team_id, 'team_name': last_bid.team.name}
    last_bid.delete()

    remaining = (
        Bid.objects.filter(tournament=session.tournament, player=session.current_player)
        .order_by('-amount')
        .first()
    )
    session.current_highest_bid = remaining.amount if remaining else None
    session.current_highest_team = remaining.team if remaining else None
    session.save()

    _log_event(session, AuctionEvent.EventType.BID_UNDONE, actor=actor, player=session.current_player, detail=detail)
    return session


def manual_assign(session, player, team, price, actor=None):
    if team.tournament_id != player.tournament_id:
        raise EngineError('Team and player must belong to the same tournament.')

    player.status = Player.Status.SOLD
    player.team = team
    player.sold_price = price
    player.pool = None
    player.save()

    _log_event(
        session, AuctionEvent.EventType.MANUAL_ASSIGN, actor=actor, player=player,
        detail={'team_id': team.id, 'team_name': team.name, 'amount': str(price)},
    )

    if session.current_player_id == player.id:
        _clear_current_player(session)
        session.save()
    return session
