from django.conf import settings
from django.db import models

from apps.tournaments.models import Tournament


class Team(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='teams')
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='teams/logos/', blank=True, null=True)

    owner_name = models.CharField(max_length=255, blank=True)
    owner_photo = models.ImageField(upload_to='teams/owners/', blank=True, null=True)
    owner_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='owned_teams',
    )

    budget_total = models.DecimalField(max_digits=12, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('tournament', 'name')
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.tournament.name})'

    @property
    def budget_spent(self):
        total = self.players.filter(status='sold').aggregate(total=models.Sum('sold_price'))['total']
        return total or 0

    @property
    def budget_remaining(self):
        return self.budget_total - self.budget_spent

    @property
    def squad_size(self):
        return self.players.filter(status='sold').count()
