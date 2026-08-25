from django.contrib import admin

from .models import AuctionEvent, AuctionSession, Bid, Wishlist


@admin.register(AuctionSession)
class AuctionSessionAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'status', 'current_player', 'current_highest_bid', 'current_highest_team')
    list_filter = ('status',)


@admin.register(Bid)
class BidAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'player', 'team', 'amount', 'placed_by', 'placed_at')
    list_filter = ('tournament', 'team')
    search_fields = ('player__name', 'team__name')


@admin.register(AuctionEvent)
class AuctionEventAdmin(admin.ModelAdmin):
    list_display = ('tournament', 'event_type', 'player', 'actor', 'created_at')
    list_filter = ('tournament', 'event_type')


@admin.register(Wishlist)
class WishlistAdmin(admin.ModelAdmin):
    list_display = ('team', 'player', 'added_by', 'created_at')
    list_filter = ('team',)
