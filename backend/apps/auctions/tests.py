from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.players.models import Player
from apps.pools.models import Pool
from apps.teams.models import Team
from apps.tournaments.models import Tournament

from . import engine
from .models import Bid


class BidCooldownTests(TestCase):
    """After any bid lands, a short window blocks the next bid — gives everyone time
    to see the new price before it's possible to bid again."""

    def setUp(self):
        self.tournament = Tournament.objects.create(name='Test Cup', default_team_budget=Decimal('1000'))
        self.pool = Pool.objects.create(tournament=self.tournament, name='Pool A')
        self.player = Player.objects.create(
            tournament=self.tournament, name='P1', base_price=Decimal('10'),
            pool=self.pool, status=Player.Status.POOLED,
        )
        self.team_a = Team.objects.create(tournament=self.tournament, name='Team A', budget_total=Decimal('1000'))
        self.team_b = Team.objects.create(tournament=self.tournament, name='Team B', budget_total=Decimal('1000'))
        engine.start_auction(self.tournament)
        self.session = engine.get_or_create_session(self.tournament)
        engine.start_next_player(self.session, pool=self.pool)

    def test_second_bid_within_cooldown_is_rejected(self):
        engine.place_bid(self.session, self.team_a)
        with self.assertRaises(engine.EngineError):
            engine.place_bid(self.session, self.team_b)

    def test_bid_allowed_once_cooldown_elapses(self):
        engine.place_bid(self.session, self.team_a)
        Bid.objects.filter(player=self.player).update(
            placed_at=timezone.now() - timedelta(seconds=self.tournament.bid_cooldown_seconds + 1)
        )
        engine.place_bid(self.session, self.team_b)
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_highest_team_id, self.team_b.id)

    def test_cooldown_length_is_configurable_per_tournament(self):
        self.tournament.bid_cooldown_seconds = 0
        self.tournament.save(update_fields=['bid_cooldown_seconds'])
        self.session.tournament.refresh_from_db()  # engine reads session.tournament, which caches the FK
        engine.place_bid(self.session, self.team_a)
        engine.place_bid(self.session, self.team_b)  # would raise if cooldown were still enforced
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_highest_team_id, self.team_b.id)


class CustomBidAmountTests(TestCase):
    """A team can name their own bid amount as long as it clears the minimum next bid."""

    def setUp(self):
        self.tournament = Tournament.objects.create(name='Test Cup', default_team_budget=Decimal('1000'))
        self.pool = Pool.objects.create(tournament=self.tournament, name='Pool A')
        self.player = Player.objects.create(
            tournament=self.tournament, name='P1', base_price=Decimal('10'),
            pool=self.pool, status=Player.Status.POOLED,
        )
        self.team = Team.objects.create(tournament=self.tournament, name='Team A', budget_total=Decimal('1000'))
        engine.start_auction(self.tournament)
        self.session = engine.get_or_create_session(self.tournament)
        engine.start_next_player(self.session, pool=self.pool)

    def test_custom_amount_below_minimum_rejected(self):
        with self.assertRaises(engine.EngineError):
            engine.place_bid(self.session, self.team, amount='5')

    def test_custom_amount_at_or_above_minimum_accepted(self):
        engine.place_bid(self.session, self.team, amount='50')
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_highest_bid, Decimal('50.00'))

    def test_default_bid_still_uses_auto_increment(self):
        engine.place_bid(self.session, self.team)
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_highest_bid, self.player.base_price)


class PurseSafetyTests(TestCase):
    """A bid must leave enough budget to actually buy the rest of the required squad —
    not just $1 per remaining slot, but the cheapest remaining player's real base price."""

    def setUp(self):
        self.tournament = Tournament.objects.create(
            name='Test Cup', default_team_budget=Decimal('100'), players_per_team_min=3,
        )
        self.pool = Pool.objects.create(tournament=self.tournament, name='Pool A')
        self.player = Player.objects.create(
            tournament=self.tournament, name='Up now', base_price=Decimal('5'),
            pool=self.pool, status=Player.Status.POOLED,
        )
        # Two more players still purchasable elsewhere, cheapest at base price 5 —
        # the team must be left with at least 2 * 5 = 10 after this bid.
        Player.objects.create(tournament=self.tournament, name='P2', base_price=Decimal('5'))
        Player.objects.create(tournament=self.tournament, name='P3', base_price=Decimal('8'))
        self.team = Team.objects.create(tournament=self.tournament, name='Team A', budget_total=Decimal('100'))
        engine.start_auction(self.tournament)
        self.session = engine.get_or_create_session(self.tournament)
        engine.start_next_player(self.session, pool=self.pool)

    def test_bid_leaving_less_than_cheapest_remaining_players_cost_is_rejected(self):
        # 100 - 91 = 9 left, but 2 more required players at >= 5 each need 10.
        with self.assertRaises(engine.EngineError):
            engine.place_bid(self.session, self.team, amount='91')

    def test_bid_leaving_exactly_enough_for_remaining_players_is_accepted(self):
        # 100 - 90 = 10 left, exactly enough for 2 more players at the 5 floor.
        engine.place_bid(self.session, self.team, amount='90')
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_highest_bid, Decimal('90.00'))


class LowPriorityDrawOrderTests(TestCase):
    """Players returned to a pool after going unsold are only drawn once every
    normal-priority player in that pool has been auctioned."""

    def setUp(self):
        self.tournament = Tournament.objects.create(name='Test Cup', default_team_budget=Decimal('1000'))
        self.pool = Pool.objects.create(tournament=self.tournament, name='Pool A')
        engine.start_auction(self.tournament)
        self.session = engine.get_or_create_session(self.tournament)

    def test_low_priority_player_skipped_while_normal_players_remain(self):
        Player.objects.create(
            tournament=self.tournament, name='Normal', base_price=Decimal('10'),
            pool=self.pool, status=Player.Status.POOLED, low_priority=False,
        )
        Player.objects.create(
            tournament=self.tournament, name='Returned', base_price=Decimal('10'),
            pool=self.pool, status=Player.Status.POOLED, low_priority=True,
        )
        engine.start_next_player(self.session, pool=self.pool)
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_player.name, 'Normal')

    def test_low_priority_player_drawn_once_no_normal_players_left(self):
        Player.objects.create(
            tournament=self.tournament, name='Returned', base_price=Decimal('10'),
            pool=self.pool, status=Player.Status.POOLED, low_priority=True,
        )
        engine.start_next_player(self.session, pool=self.pool)
        self.session.refresh_from_db()
        self.assertEqual(self.session.current_player.name, 'Returned')
        self.assertFalse(self.session.current_player.low_priority)
