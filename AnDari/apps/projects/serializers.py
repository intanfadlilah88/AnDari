from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    region_nama = serializers.CharField(source='region.nama', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'nama_proyek', 'pemilik', 'region', 'region_nama',
            'panjang_lahan', 'lebar_lahan', 'jumlah_lantai',
            'gaya_arsitektur', 'target_budget',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']