from rest_framework.routers import DefaultRouter

from .views import BidIncrementRuleViewSet, PositionViewSet, TournamentViewSet

router = DefaultRouter()
router.register('tournaments', TournamentViewSet)
router.register('positions', PositionViewSet)
router.register('increment-rules', BidIncrementRuleViewSet)

urlpatterns = router.urls
