from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.players.models import Player
from apps.tournaments.models import Tournament

from .models import Pool

User = get_user_model()


class ReturnUnsoldToPoolTests(TestCase):
    """Unsold players can be sent back to whichever pool they originally came from,
    flagged low-priority instead of forcing them into a brand-new re-round pool."""

    def setUp(self):
        self.tournament = Tournament.objects.create(name='Test Cup', default_team_budget=Decimal('1000'))
        self.pool = Pool.objects.create(tournament=self.tournament, name='Pool A')
        self.player = Player.objects.create(
            tournament=self.tournament, name='P1', base_price=Decimal('10'),
            pool=self.pool, status=Player.Status.UNSOLD,
        )
        self.user = User.objects.create_user(username='admin', password='pw', role=User.Role.SUPER_ADMIN)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_returns_player_to_original_pool_as_low_priority(self):
        res = self.client.post('/api/pools/return-unsold-to-pool/', {
            'tournament': self.tournament.id,
            'player_ids': [self.player.id],
        }, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.player.refresh_from_db()
        self.assertEqual(self.player.status, Player.Status.POOLED)
        self.assertEqual(self.player.pool_id, self.pool.id)
        self.assertTrue(self.player.low_priority)

    def test_rejects_when_no_eligible_players(self):
        sold_player = Player.objects.create(
            tournament=self.tournament, name='P2', base_price=Decimal('10'), status=Player.Status.SOLD,
        )
        res = self.client.post('/api/pools/return-unsold-to-pool/', {
            'tournament': self.tournament.id,
            'player_ids': [sold_player.id],
        }, format='json')
        self.assertEqual(res.status_code, 400)
