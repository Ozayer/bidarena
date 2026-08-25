from rest_framework import viewsets

from .models import Player
from .serializers import PlayerSerializer


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    filterset_fields = ['tournament', 'position', 'pool', 'team', 'status']
    search_fields = ['name']

    # TODO: bulk Excel upload endpoint (apps/players/views.py) — planned next,
    # see REQUIREMENTS.md 2.2. Needs row-level validation/error reporting.
