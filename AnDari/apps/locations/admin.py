from django.contrib import admin
from .models import Region


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ('id', 'nama', 'provinsi', 'kode', 'is_active', 'created_at')
    list_filter = ('is_active', 'provinsi')
    search_fields = ('nama', 'provinsi', 'kode')
    ordering = ('nama',)
    readonly_fields = ('created_at',)