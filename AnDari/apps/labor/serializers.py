# apps/labor/serializers.py

from rest_framework import serializers
from .models import Labor, LaborPrice


class LaborSerializer(serializers.ModelSerializer):
    class Meta:
        model = Labor
        fields = '__all__'


class LaborPriceSerializer(serializers.ModelSerializer):
    region_nama = serializers.CharField(source='region.nama', read_only=True)

    class Meta:
        model = LaborPrice
        fields = [
            'id', 'labor', 'region', 'region_nama',
            'upah_per_satuan', 'source',
            'source_ref_id', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']