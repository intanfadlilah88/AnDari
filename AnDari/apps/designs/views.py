# apps/designs/views.py

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Building, Floor, Room, Wall, Door, Window
from .serializers import (
    BuildingSerializer,
    BuildingSimpleSerializer,
    FloorSerializer,
    RoomSerializer,
    WallSerializer,
    DoorSerializer,
    WindowSerializer,
)


# ============================================
# BUILDING
# ============================================
class BuildingViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/buildings/
    Filter:   ?project=<id>
    """
    queryset = Building.objects.all()
    serializer_class = BuildingSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=True, methods=['get'])
    def simple(self, request, pk=None):
        """Endpoint ringkas: /api/buildings/<id>/simple/"""
        building = self.get_object()
        serializer = BuildingSimpleSerializer(building)
        return Response(serializer.data)


# ============================================
# FLOOR
# ============================================
class FloorViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/floors/
    Filter:   ?building=<id>
    """
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        building_id = self.request.query_params.get('building')
        if building_id:
            qs = qs.filter(building_id=building_id)
        return qs


# ============================================
# ROOM
# ============================================
class RoomViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/rooms/
    Filter:   ?floor=<id>
    """
    queryset = Room.objects.all()
    serializer_class = RoomSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        floor_id = self.request.query_params.get('floor')
        if floor_id:
            qs = qs.filter(floor_id=floor_id)
        return qs

    @action(detail=False, methods=['delete'])
    def delete_by_floor(self, request):
        """
        Hapus semua ruangan di satu floor.
        DELETE /api/rooms/delete_by_floor/?floor=<id>
        """
        floor_id = request.query_params.get('floor')
        if not floor_id:
            return Response(
                {'error': 'Parameter floor wajib diisi.'},
                status=400,
            )
        deleted_count, _ = Room.objects.filter(floor_id=floor_id).delete()
        return Response({
            'status': 'ok',
            'deleted': deleted_count,
        })


# ============================================
# WALL
# ============================================
class WallViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/walls/
    Filter:   ?floor=<id>
    """
    queryset = Wall.objects.all()
    serializer_class = WallSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        floor_id = self.request.query_params.get('floor')
        if floor_id:
            qs = qs.filter(floor_id=floor_id)
        return qs


# ============================================
# DOOR
# ============================================
class DoorViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/doors/
    Filter:   ?wall=<id>
    """
    queryset = Door.objects.all()
    serializer_class = DoorSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wall_id = self.request.query_params.get('wall')
        if wall_id:
            qs = qs.filter(wall_id=wall_id)
        return qs


# ============================================
# WINDOW
# ============================================
class WindowViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/windows/
    Filter:   ?wall=<id>
    """
    queryset = Window.objects.all()
    serializer_class = WindowSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        wall_id = self.request.query_params.get('wall')
        if wall_id:
            qs = qs.filter(wall_id=wall_id)
        return qs