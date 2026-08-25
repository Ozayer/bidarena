from rest_framework import permissions, viewsets

from .models import AuctionEvent, AuctionSession, Bid, Wishlist
from .serializers import (
    AuctionEventSerializer,
    AuctionSessionSerializer,
    BidSerializer,
    WishlistSerializer,
)


class AuctionSessionViewSet(viewsets.ModelViewSet):
    queryset = AuctionSession.objects.all()
    serializer_class = AuctionSessionSerializer
    filterset_fields = ['tournament', 'status']


class BidViewSet(viewsets.ModelViewSet):
    """Read/create only for now — full validation (auto-increment, purse-safety,
    timer reset) lands with the auction engine."""

    queryset = Bid.objects.all()
    serializer_class = BidSerializer
    filterset_fields = ['tournament', 'player', 'team']

    def perform_create(self, serializer):
        serializer.save(placed_by=self.request.user if self.request.user.is_authenticated else None)


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
        serializer.save(added_by=self.request.user)
