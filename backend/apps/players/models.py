from django.db import models

from apps.tournaments.models import Position, Tournament


class Player(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'available', 'Available'
        POOLED = 'pooled', 'In Pool'
        IN_AUCTION = 'in_auction', 'Currently Up for Bidding'
        SOLD = 'sold', 'Sold'
        UNSOLD = 'unsold', 'Unsold'

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='players')
    name = models.CharField(max_length=255)
    photo = models.ImageField(upload_to='players/photos/', blank=True, null=True)
    position = models.ForeignKey(
        Position, on_delete=models.SET_NULL, null=True, blank=True, related_name='players'
    )
    base_price = models.DecimalField(max_digits=12, decimal_places=2)

    # Flexible sport-specific stats, e.g. {"age": 27, "matches_played": 40}
    extra_info = models.JSONField(default=dict, blank=True)

    status = models.CharField(max_length=16, choices=Status.choices, default=Status.AVAILABLE)

    pool = models.ForeignKey(
        'pools.Pool', on_delete=models.SET_NULL, null=True, blank=True, related_name='players'
    )
    low_priority = models.BooleanField(
        default=False,
        help_text=(
            'Set when an unsold player is returned to their original pool — they are '
            'skipped in random draws until every normal-priority player in that pool is gone.'
        ),
    )
    team = models.ForeignKey(
        'teams.Team', on_delete=models.SET_NULL, null=True, blank=True, related_name='players'
    )
    sold_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.tournament.name})'
