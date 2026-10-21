from rest_framework import serializers
from .models import Building, Floor, Room, Wall, Door, Window


# ============================================
# DOOR
# ============================================
class DoorSerializer(serializers.ModelSerializer):
    material_nama = serializers.CharField(
        source='material.nama',
        read_only=True,
    )

    class Meta:
        model = Door
        fields = [
            'id', 'wall', 'offset', 'lebar', 'tinggi',
            'material', 'material_nama',
        ]


# ============================================
# WINDOW
# ============================================
class WindowSerializer(serializers.ModelSerializer):
    material_nama = serializers.CharField(
        source='material.nama',
        read_only=True,
    )

    class Meta:
        model = Window
        fields = [
            'id', 'wall', 'offset', 'lebar', 'tinggi',
            'material', 'material_nama',
        ]


# ============================================
# WALL
# ============================================
class WallSerializer(serializers.ModelSerializer):
    doors = DoorSerializer(many=True, read_only=True)
    windows = WindowSerializer(many=True, read_only=True)

    class Meta:
        model = Wall
        fields = [
            'id', 'floor',
            'start_x', 'start_y', 'end_x', 'end_y',
            'tebal', 'tinggi',
            'doors', 'windows',
        ]


# ============================================
# ROOM
# ============================================
class RoomSerializer(serializers.ModelSerializer):
    # ✅ Luas otomatis (read-only)
    luas = serializers.ReadOnlyField()

    class Meta:
        model = Room
        fields = [
            'id', 'floor', 'nama',
            'x', 'y', 'panjang', 'lebar',
            'luas', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'luas']


# ============================================
# FLOOR
# ============================================
class FloorSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)
    walls = WallSerializer(many=True, read_only=True)
    total_luas = serializers.SerializerMethodField()

    class Meta:
        model = Floor
        fields = [
            'id', 'building', 'level', 'tinggi_dinding',
            'rooms', 'walls', 'total_luas',
        ]

    def get_total_luas(self, obj):
        """Total luas semua ruangan di lantai ini (m²)."""
        total = sum(float(r.panjang) * float(r.lebar) for r in obj.rooms.all())
        return round(total, 2)


# ============================================
# BUILDING
# ============================================
class BuildingSerializer(serializers.ModelSerializer):
    floors = FloorSerializer(many=True, read_only=True)

    class Meta:
        model = Building
        fields = [
            'id', 'project', 'nama',
            'floors', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================
# NESTED BUILDING (untuk proyek detail)
# ============================================
class BuildingSimpleSerializer(serializers.ModelSerializer):
    """Versi ringkas — tanpa nested floors (untuk list)."""

    class Meta:
        model = Building
        fields = ['id', 'project', 'nama', 'created_at']