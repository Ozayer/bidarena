from django.conf import settings
from django.db import models

from apps.players.models import Player
from apps.pools.models import Pool
from apps.teams.models import Team
from apps.tournaments.models import Tournament


class AuctionSession(models.Model):
    """One live run of an auction for a tournament: tracks the player currently up for bidding."""

    class Status(models.TextChoices):
        NOT_STARTED = 'not_started', 'Not Started'
        LIVE = 'live', 'Live'
        PAUSED = 'paused', 'Paused'
        COMPLETED = 'completed', 'Completed'

    tournament = models.OneToOneField(Tournament, on_delete=models.CASCADE, related_name='auction_session')
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NOT_STARTED)

    active_pool = models.ForeignKey(Pool, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    current_player = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True, related_name='+')
    current_highest_bid = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    current_highest_team = models.ForeignKey(
        Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )

    timer_ends_at = models.DateTimeField(null=True, blank=True)
    timer_paused_remaining_seconds = models.PositiveIntegerField(
        null=True, blank=True, help_text='Seconds left on the clock when paused'
    )

    started_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Auction for {self.tournament.name} [{self.status}]'


class Bid(models.Model):
    """Full audit log of every bid placed."""

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='bids')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='bids')
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='bids')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    placed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='bids_placed'
    )
    placed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-placed_at']

    def __str__(self):
        return f'{self.team.name} bid {self.amount} for {self.player.name}'


class AuctionEvent(models.Model):
    """Log of admin actions during the auction, for audit/undo purposes."""

    class EventType(models.TextChoices):
        PLAYER_STARTED = 'player_started', 'Player Started'
        SOLD = 'sold', 'Sold'
        UNSOLD = 'unsold', 'Unsold'
        PAUSED = 'paused', 'Paused'
        RESUMED = 'resumed', 'Resumed'
        TIMER_EXTENDED = 'timer_extended', 'Timer Extended'
        BID_UNDONE = 'bid_undone', 'Bid Undone'
        MANUAL_ASSIGN = 'manual_assign', 'Manual Assign'
        RE_ROUND_STARTED = 're_round_started', 'Re-round Started'

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='auction_events')
    player = models.ForeignKey(
        Player, on_delete=models.SET_NULL, null=True, blank=True, related_name='auction_events'
    )
    event_type = models.CharField(max_length=32, choices=EventType.choices)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='auction_events'
    )
    detail = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.event_type} - {self.tournament.name}'


class Wishlist(models.Model):
    """Private per-owner target list, visible only to that owner."""

    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='wishlist_items')
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='wishlisted_by')
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='wishlist_items'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('team', 'player')

    def __str__(self):
        return f'{self.team.name} wishlist: {self.player.name}'
