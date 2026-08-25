from django.contrib import admin

from .models import Pool


@admin.register(Pool)
class PoolAdmin(admin.ModelAdmin):
    list_display = ('name', 'tournament', 'position', 'pool_type', 'round_number', 'order', 'status')
    list_filter = ('tournament', 'pool_type', 'status')
    search_fields = ('name',)
