from rest_framework import serializers

from .models import AuctionEvent, AuctionSession, Bid, Wishlist


class AuctionSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuctionSession
        fields = [
            'id', 'tournament', 'status', 'active_pool', 'current_player',
            'current_highest_bid', 'current_highest_team', 'timer_ends_at',
            'timer_paused_remaining_seconds', 'started_at', 'updated_at',
        ]
        read_only_fields = ['updated_at']


class BidSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bid
        fields = ['id', 'tournament', 'player', 'team', 'amount', 'placed_by', 'placed_at']
        read_only_fields = ['placed_by', 'placed_at']


class AuctionEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuctionEvent
        fields = ['id', 'tournament', 'player', 'event_type', 'actor', 'detail', 'created_at']
        read_only_fields = ['actor', 'created_at']


class WishlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wishlist
        fields = ['id', 'team', 'player', 'added_by', 'created_at']
        read_only_fields = ['added_by', 'created_at']
