from django.contrib.auth import get_user_model
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import exceptions, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.players.models import Player
from apps.pools.models import Pool
from apps.teams.models import Team
from apps.tournaments.models import Tournament

from . import engine
from .models import AuctionEvent, AuctionSession, Bid, Wishlist
from .broadcast import broadcast_state
from .serializers import (
    AuctionEventSerializer,
    AuctionSessionSerializer,
    AuctionStateSerializer,
    BidSerializer,
    WishlistSerializer,
)


User = get_user_model()


def _actor(request):
    return request.user if request.user.is_authenticated else None


def _is_admin(user):
    return user.is_authenticated and user.role in (User.Role.SUPER_ADMIN, User.Role.TOURNAMENT_ADMIN)


def _admin_required(request):
    """Returns a 403 Response if the requester isn't a tournament/super admin, else None."""
    if not _is_admin(request.user):
        return Response({'detail': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
    return None


class AuctionSessionViewSet(viewsets.ModelViewSet):
    queryset = AuctionSession.objects.all()
    serializer_class = AuctionSessionSerializer
    filterset_fields = ['tournament', 'status']

    @action(detail=False, methods=['get'], url_path='for_tournament')
    def for_tournament(self, request):
        tournament = get_object_or_404(Tournament, pk=request.query_params.get('tournament'))
        session = engine.get_or_create_session(tournament)
        return Response(AuctionStateSerializer(session, context={'request': request}).data)

    def _locked_session(self, pk):
        return AuctionSession.objects.select_for_update().get(pk=pk)

    def _run(self, request, pk, fn):
        try:
            with transaction.atomic():
                session = self._locked_session(pk)
                session = fn(session)
        except engine.EngineError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        broadcast_state(session)
        return Response(AuctionStateSerializer(session, context={'request': request}).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        return self._run(request, pk, lambda s: engine.start_auction(s.tournament, actor=_actor(request)))

    @action(detail=True, methods=['post'], url_path='next-player')
    def next_player(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        pool = None
        if request.data.get('pool'):
            pool = get_object_or_404(Pool, pk=request.data['pool'])
        return self._run(request, pk, lambda s: engine.start_next_player(s, pool=pool, actor=_actor(request)))

    @action(detail=True, methods=['post'], url_path='place-bid')
    def place_bid(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response({'detail': 'Authentication required.'}, status=status.HTTP_401_UNAUTHORIZED)
        team = get_object_or_404(Team, pk=request.data.get('team'))
        if not _is_admin(request.user) and team.owner_user_id != request.user.id:
            return Response({'detail': 'You can only bid for your own team.'}, status=status.HTTP_403_FORBIDDEN)
        amount = request.data.get('amount')
        return self._run(request, pk, lambda s: engine.place_bid(s, team, actor=_actor(request), amount=amount))

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        return self._run(request, pk, lambda s: engine.pause(s, actor=_actor(request)))

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        return self._run(request, pk, lambda s: engine.resume(s, actor=_actor(request)))

    @action(detail=True, methods=['post'], url_path='extend-timer')
    def extend_timer(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        seconds = request.data.get('seconds')
        seconds = int(seconds) if seconds else None
        return self._run(request, pk, lambda s: engine.extend_timer(s, seconds=seconds, actor=_actor(request)))

    @action(detail=True, methods=['post'], url_path='mark-sold')
    def mark_sold(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        return self._run(request, pk, lambda s: engine.mark_sold(s, actor=_actor(request)))

    @action(detail=True, methods=['post'], url_path='mark-unsold')
    def mark_unsold(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        return self._run(request, pk, lambda s: engine.mark_unsold(s, actor=_actor(request)))

    @action(detail=True, methods=['post'], url_path='undo-last-bid')
    def undo_last_bid(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        return self._run(request, pk, lambda s: engine.undo_last_bid(s, actor=_actor(request)))

    @action(detail=True, methods=['post'], url_path='manual-assign')
    def manual_assign(self, request, pk=None):
        if (resp := _admin_required(request)) is not None:
            return resp
        player = get_object_or_404(Player, pk=request.data.get('player'))
        team = get_object_or_404(Team, pk=request.data.get('team'))
        price = request.data.get('price')
        return self._run(
            request, pk, lambda s: engine.manual_assign(s, player, team, price, actor=_actor(request))
        )


class BidViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit log — bids are placed through AuctionSessionViewSet.place_bid
    so the engine can enforce increments, purse-safety, and concurrency locking."""

    queryset = Bid.objects.all()
    serializer_class = BidSerializer
    filterset_fields = ['tournament', 'player', 'team']


class AuctionEventViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuctionEvent.objects.all()
    serializer_class = AuctionEventSerializer
    filterset_fields = ['tournament', 'event_type']


class WishlistViewSet(viewsets.ModelViewSet):
    """Private to the requesting team owner — never exposes other owners' wishlists."""

    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['team']

    def get_queryset(self):
        return Wishlist.objects.filter(added_by=self.request.user)

    def perform_create(self, serializer):
        team = serializer.validated_data['team']
        if not _is_admin(self.request.user) and team.owner_user_id != self.request.user.id:
            raise exceptions.PermissionDenied("You can only manage your own team's wishlist.")
        serializer.save(added_by=self.request.user)
