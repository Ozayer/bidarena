from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.tournaments.models import Tournament

from .bulk_upload import build_template_workbook, parse_and_create_players
from .models import Player
from .serializers import PlayerSerializer


class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    filterset_fields = ['tournament', 'position', 'pool', 'team', 'status']
    search_fields = ['name']

    @action(detail=False, methods=['get'], url_path='bulk_upload_template')
    def bulk_upload_template(self, request):
        wb = build_template_workbook()
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="players_template.xlsx"'
        wb.save(response)
        return response

    @action(detail=False, methods=['post'], url_path='bulk_upload')
    def bulk_upload(self, request):
        tournament_id = request.data.get('tournament')
        file = request.FILES.get('file')

        if not tournament_id or not file:
            return Response(
                {'detail': 'Both "tournament" and "file" are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            tournament = Tournament.objects.get(pk=tournament_id)
        except Tournament.DoesNotExist:
            return Response({'detail': 'Tournament not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            result = parse_and_create_players(file, tournament)
        except Exception:
            return Response(
                {'detail': 'Could not read file — make sure it is a valid .xlsx spreadsheet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)
