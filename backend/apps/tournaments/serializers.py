from rest_framework import serializers

from .models import BidIncrementRule, Position, Tournament


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = ['id', 'tournament', 'name', 'order']


class BidIncrementRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BidIncrementRule
        fields = ['id', 'tournament', 'from_amount', 'to_amount', 'increment_amount']


class TournamentSerializer(serializers.ModelSerializer):
    positions = PositionSerializer(many=True, read_only=True)
    increment_rules = BidIncrementRuleSerializer(many=True, read_only=True)

    class Meta:
        model = Tournament
        fields = [
            'id', 'name', 'slug', 'description', 'cover_photo', 'status',
            'start_date', 'end_date',
            'num_teams', 'players_per_team_min', 'players_per_team_max',
            'default_team_budget', 'bid_timer_seconds', 'bid_timer_extend_seconds', 'bid_cooldown_seconds',
            'result_display_seconds',
            'public_guest_link_enabled', 'created_by', 'created_at', 'updated_at',
            'positions', 'increment_rules',
            'themed_display_enabled', 'theme_primary_logo', 'theme_club_logo', 'theme_sponsor_logo',
        ]
        read_only_fields = ['slug', 'created_by', 'created_at', 'updated_at']
