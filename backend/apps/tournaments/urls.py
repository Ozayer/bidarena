from rest_framework.routers import DefaultRouter

from .views import BidIncrementRuleViewSet, PositionViewSet, TournamentSponsorLogoViewSet, TournamentViewSet

router = DefaultRouter()
router.register('tournaments', TournamentViewSet)
router.register('positions', PositionViewSet)
router.register('increment-rules', BidIncrementRuleViewSet)
router.register('sponsor-logos', TournamentSponsorLogoViewSet)

urlpatterns = router.urls
