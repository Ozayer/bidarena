from rest_framework import serializers

from apps.players.serializers import PlayerSerializer
from apps.pools.serializers import PoolSerializer
from apps.teams.serializers import TeamSerializer

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
    team_name = serializers.CharField(source='team.name', read_only=True)

    class Meta:
        model = Bid
        fields = ['id', 'tournament', 'player', 'team', 'team_name', 'amount', 'placed_by', 'placed_at']
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


class AuctionStateSerializer(serializers.ModelSerializer):
    """Rich, self-contained snapshot of the auction — broadcast to every client
    (admin console, owner devices, room display, guest viewers) on every change."""

    active_pool_detail = PoolSerializer(source='active_pool', read_only=True)
    current_player_detail = PlayerSerializer(source='current_player', read_only=True)
    current_highest_team_detail = TeamSerializer(source='current_highest_team', read_only=True)
    recent_bids = serializers.SerializerMethodField()

    class Meta:
        model = AuctionSession
        fields = [
            'id', 'tournament', 'status', 'active_pool', 'active_pool_detail',
            'current_player', 'current_player_detail', 'current_highest_bid',
            'current_highest_team', 'current_highest_team_detail', 'timer_ends_at',
            'timer_paused_remaining_seconds', 'started_at', 'updated_at', 'recent_bids',
        ]

    def get_recent_bids(self, obj):
        if not obj.current_player_id:
            return []
        bids = Bid.objects.filter(
            tournament=obj.tournament, player_id=obj.current_player_id
        ).order_by('-placed_at')[:10]
        return BidSerializer(bids, many=True).data
