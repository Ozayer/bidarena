from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.players.models import Player
from apps.tournaments.models import Tournament

from .models import Pool
from .serializers import PoolSerializer


class PoolViewSet(viewsets.ModelViewSet):
    queryset = Pool.objects.all()
    serializer_class = PoolSerializer
    filterset_fields = ['tournament', 'pool_type', 'status']
    search_fields = ['name']

    @action(detail=False, methods=['post'], url_path='create-re-round')
    def create_re_round(self, request):
        tournament = get_object_or_404(Tournament, pk=request.data.get('tournament'))
        player_ids = request.data.get('player_ids') or []
        name = (request.data.get('name') or '').strip() or 'Unsold Re-round'

        players = Player.objects.filter(
            tournament=tournament, id__in=player_ids, status=Player.Status.UNSOLD
        )
        if not players.exists():
            return Response(
                {'detail': 'No unsold players found among the selected players.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_round = Pool.objects.filter(tournament=tournament).aggregate(m=Max('round_number'))['m'] or 1
        pool = Pool.objects.create(
            tournament=tournament,
            name=name,
            pool_type=Pool.PoolType.UNSOLD_ROUND,
            round_number=max_round + 1,
            order=Pool.objects.filter(tournament=tournament).count(),
        )
        players.update(pool=pool, status=Player.Status.POOLED)

        return Response(PoolSerializer(pool).data, status=status.HTTP_201_CREATED)
