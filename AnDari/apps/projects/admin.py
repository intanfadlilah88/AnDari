from django.contrib import admin
from .models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'nama_proyek', 'region', 'panjang_lahan', 'lebar_lahan', 'created_at')
    list_filter = ('region',) 
    search_fields = ('nama_proyek',)
    