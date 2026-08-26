from django.contrib.auth import get_user_model
from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .exports import build_results_csv, build_results_pdf
from .models import BidIncrementRule, Position, Tournament, TournamentSponsorLogo
from .serializers import (
    BidIncrementRuleSerializer,
    PositionSerializer,
    TournamentSerializer,
    TournamentSponsorLogoSerializer,
)

User = get_user_model()


def _is_admin(user):
    return user.is_authenticated and user.role in (User.Role.SUPER_ADMIN, User.Role.TOURNAMENT_ADMIN)


class TournamentViewSet(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    filterset_fields = ['status', 'slug', 'public_guest_link_enabled']
    search_fields = ['name']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user if self.request.user.is_authenticated else None)

    @action(detail=True, methods=['get'], url_path='export-csv')
    def export_csv(self, request, pk=None):
        if not _is_admin(request.user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        tournament = self.get_object()
        response = HttpResponse(build_results_csv(tournament), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{tournament.slug}-results.csv"'
        return response

    @action(detail=True, methods=['get'], url_path='export-pdf')
    def export_pdf(self, request, pk=None):
        if not _is_admin(request.user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
        tournament = self.get_object()
        response = HttpResponse(build_results_pdf(tournament), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{tournament.slug}-results.pdf"'
        return response


class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer
    filterset_fields = ['tournament']


class BidIncrementRuleViewSet(viewsets.ModelViewSet):
    queryset = BidIncrementRule.objects.all()
    serializer_class = BidIncrementRuleSerializer
    filterset_fields = ['tournament']


class TournamentSponsorLogoViewSet(viewsets.ModelViewSet):
    queryset = TournamentSponsorLogo.objects.all()
    serializer_class = TournamentSponsorLogoSerializer
    filterset_fields = ['tournament']
