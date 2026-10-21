# apps/materials/serializers.py

from rest_framework import serializers
from .models import Material


class MaterialSerializer(serializers.ModelSerializer):
    region_nama = serializers.CharField(source='region.nama', read_only=True)

    class Meta:
        model = Material
        fields = [
            'id', 'nama_material', 'satuan', 'harga_satuan',
            'region', 'region_nama', 'source',
            'external_url', 'last_updated',
        ]
        read_only_fields = ['id', 'last_updated']