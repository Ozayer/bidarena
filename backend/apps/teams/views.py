from django.contrib.auth import get_user_model
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Team
from .serializers import TeamSerializer

User = get_user_model()


def _is_admin(user):
    return user.is_authenticated and user.role in (User.Role.SUPER_ADMIN, User.Role.TOURNAMENT_ADMIN)


class TeamViewSet(viewsets.ModelViewSet):
    queryset = Team.objects.all()
    serializer_class = TeamSerializer
    filterset_fields = ['tournament', 'owner_user']
    search_fields = ['name', 'owner_name']

    @action(detail=True, methods=['post'], url_path='set-owner-account')
    def set_owner_account(self, request, pk=None):
        """Admin-only: create or reset the login the team owner uses to bid from their own device."""
        if not _is_admin(request.user):
            return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        team = self.get_object()
        username = (request.data.get('username') or '').strip()
        password = request.data.get('password') or ''
        if not username or not password:
            return Response(
                {'detail': 'Both "username" and "password" are required.'}, status=status.HTTP_400_BAD_REQUEST
            )

        existing = User.objects.filter(username=username).first()
        if existing and existing.id != team.owner_user_id:
            return Response({'detail': 'That username is already taken.'}, status=status.HTTP_400_BAD_REQUEST)

        user = team.owner_user
        if user is None:
            user = User(username=username, role=User.Role.TEAM_OWNER)
        else:
            user.username = username
        user.set_password(password)
        user.save()

        team.owner_user = user
        team.save(update_fields=['owner_user'])

        return Response(TeamSerializer(team).data)
