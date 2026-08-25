from django.contrib import admin

from .models import Player


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('name', 'tournament', 'position', 'base_price', 'status', 'pool', 'team', 'sold_price')
    list_filter = ('tournament', 'status', 'position', 'pool')
    search_fields = ('name',)
