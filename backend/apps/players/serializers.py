from rest_framework import serializers

from .models import Player


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = [
            'id', 'tournament', 'name', 'photo', 'position', 'base_price',
            'extra_info', 'status', 'pool', 'team', 'sold_price', 'created_at',
        ]
        read_only_fields = ['created_at']
