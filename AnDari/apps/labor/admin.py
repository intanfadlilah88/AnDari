from django.contrib import admin
from .models import Labor, LaborPrice


@admin.register(Labor)
class LaborAdmin(admin.ModelAdmin):
    list_display = ('id', 'nama_peran', 'kategori', 'satuan')
    list_filter = ('kategori', 'satuan')
    search_fields = ('nama_peran',)
    ordering = ('kategori', 'nama_peran')


@admin.register(LaborPrice)
class LaborPriceAdmin(admin.ModelAdmin):
    list_display = ('id', 'labor', 'region', 'upah_per_satuan', 'source', 'updated_at')
    list_filter = ('region', 'source', 'labor__kategori')
    search_fields = ('labor__nama_peran', 'region__nama')
    ordering = ('labor', 'region')
    readonly_fields = ('updated_at',)