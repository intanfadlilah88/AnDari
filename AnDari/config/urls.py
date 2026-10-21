# config/urls.py

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework.routers import DefaultRouter

# ============================================
# IMPORT VIEWSET & FUNCTION
# ============================================
from apps.projects.views import (
    ProjectViewSet,
    hitung_rab_building,
    hitung_rab_project,
)
from apps.designs.views import (
    BuildingViewSet,
    FloorViewSet,
    RoomViewSet,
    WallViewSet,
    DoorViewSet,
    WindowViewSet,
)
from apps.locations.views import RegionViewSet
from apps.materials.views import MaterialViewSet
from apps.labor.views import LaborViewSet, LaborPriceViewSet


# ============================================
# HOMEPAGE — untuk cek backend jalan
# ============================================
def home(request):
    return JsonResponse({
        "status": "OK",
        "message": "Backend AnDari jalan! 🚀",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "api_root": "/api/",
            "regions": "/api/regions/",
            "projects": "/api/projects/",
            "buildings": "/api/buildings/",
            "floors": "/api/floors/",
            "rooms": "/api/rooms/",
            "walls": "/api/walls/",
            "doors": "/api/doors/",
            "windows": "/api/windows/",
            "materials": "/api/materials/",
            "labors": "/api/labors/",
            "labor_prices": "/api/labor-prices/",
            "rab_project": "/api/rab/project/<project_id>/",
            "rab_building": "/api/rab/building/<building_id>/",
        },
    })


# ============================================
# ROUTER — daftar ViewSet
# ============================================
router = DefaultRouter()

# ---- Projects ----
router.register(r'projects', ProjectViewSet, basename='project')

# ---- Designs ----
router.register(r'buildings', BuildingViewSet, basename='building')
router.register(r'floors', FloorViewSet, basename='floor')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'walls', WallViewSet, basename='wall')
router.register(r'doors', DoorViewSet, basename='door')
router.register(r'windows', WindowViewSet, basename='window')

# ---- Locations ----
router.register(r'regions', RegionViewSet, basename='region')

# ---- Materials ----
router.register(r'materials', MaterialViewSet, basename='material')

# ---- Labor ----
router.register(r'labors', LaborViewSet, basename='labor')
router.register(r'labor-prices', LaborPriceViewSet, basename='labor-price')


# ============================================
# URL PATTERNS
# ============================================
urlpatterns = [
    # Homepage
    path('', home, name='home'),

    # Admin Django
    path('admin/', admin.site.urls),

    # API (ViewSets otomatis)
    path('api/', include(router.urls)),

    # Login DRF (untuk browsable API)
    path('api-auth/', include('rest_framework.urls')),

    # ---- Endpoint Kustom: RAB ----
    path(
        'api/rab/building/<int:building_id>/',
        hitung_rab_building,
        name='hitung_rab_building',
    ),
    path(
        'api/rab/project/<int:project_id>/',
        hitung_rab_project,
        name='hitung_rab_project',
    ),
]