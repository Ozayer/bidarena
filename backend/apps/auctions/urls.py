from rest_framework.routers import DefaultRouter

from .views import AuctionEventViewSet, AuctionSessionViewSet, BidViewSet, WishlistViewSet

router = DefaultRouter()
router.register('auction-sessions', AuctionSessionViewSet)
router.register('bids', BidViewSet)
router.register('auction-events', AuctionEventViewSet)
router.register('wishlist', WishlistViewSet, basename='wishlist')

urlpatterns = router.urls
