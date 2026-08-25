from rest_framework import viewsets

from .models import BidIncrementRule, Position, Tournament
from .serializers import BidIncrementRuleSerializer, PositionSerializer, TournamentSerializer


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    filterset_fields = ['status']
    search_fields = ['name']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)


class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    filterset_fields = ['tournament']


class BidIncrementRuleViewSet(viewsets.ModelViewSet):
    queryset = BidIncrementRule.objects.all()
    serializer_class = BidIncrementRuleSerializer
    filterset_fields = ['tournament']
