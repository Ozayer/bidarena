from rest_framework import serializers

from .models import Pool


class PoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pool
        fields = [
            'id', 'tournament', 'name', 'position', 'pool_type',
            'round_number', 'order', 'status', 'created_at',
        ]
        read_only_fields = ['created_at']
