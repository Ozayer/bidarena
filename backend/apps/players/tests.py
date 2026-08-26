from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase

from apps.tournaments.models import Tournament

from .models import Player

User = get_user_model()


class ExtraInfoMultipartTests(APITestCase):
    """The admin form always submits multipart (to allow an optional photo file), so
    extra_info arrives as a JSON string rather than a native dict — the serializer must
    decode it back into a dict rather than storing the literal string."""

    def setUp(self):
        self.tournament = Tournament.objects.create(name='Test Cup', default_team_budget=Decimal('100'))
        self.user = User.objects.create_user(username='admin', password='pw', role=User.Role.SUPER_ADMIN)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_multipart_extra_info_json_string_is_decoded_to_dict(self):
        response = self.client.post('/api/players/', {
            'tournament': self.tournament.id,
            'name': 'Jane Doe',
            'base_price': '5',
            'extra_info': '{"nationality": "Finland", "club": "HJK"}',
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        player = Player.objects.get(id=response.data['id'])
        self.assertEqual(player.extra_info, {'nationality': 'Finland', 'club': 'HJK'})

    def test_json_body_extra_info_dict_still_works(self):
        response = self.client.post('/api/players/', {
            'tournament': self.tournament.id,
            'name': 'Jane Doe',
            'base_price': '5',
            'extra_info': {'nationality': 'Finland'},
        }, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        player = Player.objects.get(id=response.data['id'])
        self.assertEqual(player.extra_info, {'nationality': 'Finland'})

    def test_invalid_json_string_falls_through_to_normal_validation_error(self):
        response = self.client.post('/api/players/', {
            'tournament': self.tournament.id,
            'name': 'Jane Doe',
            'base_price': '5',
            'extra_info': 'not valid json',
        }, format='multipart')
        self.assertEqual(response.status_code, 400)
