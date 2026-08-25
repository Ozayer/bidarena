from django.db import models

from apps.tournaments.models import Position, Tournament


class Pool(models.Model):
    class PoolType(models.TextChoices):
        NORMAL = 'normal', 'Normal'
        UNSOLD_ROUND = 'unsold_round', 'Unsold Re-round'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'

    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='pools')
    name = models.CharField(max_length=255)
    position = models.ForeignKey(
        Position, on_delete=models.SET_NULL, null=True, blank=True, related_name='pools'
    )
    pool_type = models.CharField(max_length=16, choices=PoolType.choices, default=PoolType.NORMAL)
    round_number = models.PositiveIntegerField(
        default=1, help_text='1 = first pass, 2+ = unsold re-rounds'
    )
    order = models.PositiveIntegerField(default=0, help_text='Sequence in which pools are auctioned')
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f'{self.name} ({self.tournament.name})'
