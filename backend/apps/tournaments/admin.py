from django.contrib import admin

from .models import BidIncrementRule, Position, Tournament


class PositionInline(admin.TabularInline):
    model = Position
    extra = 1


class BidIncrementRuleInline(admin.TabularInline):
    model = BidIncrementRule
    extra = 1


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'num_teams', 'default_team_budget', 'created_at')
    list_filter = ('status',)
    search_fields = ('name',)
    prepopulated_fields = {'slug': ('name',)}
    inlines = [PositionInline, BidIncrementRuleInline]
