from django.contrib import admin

from .models import Team


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'tournament', 'owner_name', 'budget_total', 'budget_remaining', 'squad_size')
    list_filter = ('tournament',)
    search_fields = ('name', 'owner_name')
