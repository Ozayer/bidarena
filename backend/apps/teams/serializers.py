from rest_framework import serializers

from .models import Team


class TeamSerializer(serializers.ModelSerializer):
    budget_spent = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    budget_remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    squad_size = serializers.IntegerField(read_only=True)
    owner_username = serializers.CharField(source='owner_user.username', read_only=True, default=None)

    class Meta:
        model = Team
        fields = [
            'id', 'tournament', 'name', 'logo', 'owner_name', 'owner_photo',
            'owner_user', 'owner_username', 'budget_total', 'budget_spent', 'budget_remaining',
            'squad_size', 'created_at',
        ]
        read_only_fields = ['created_at']
