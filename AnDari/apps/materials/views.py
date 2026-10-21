# apps/materials/views.py

from django.shortcuts import render
from rest_framework import viewsets

# ✅ Model dari app materials (sendiri)
from .models import Material
from .serializers import MaterialSerializer

# ✅ Model dari app lain (path lengkap)
from apps.projects.models import Project
from apps.labor.models import Labor
from apps.locations.models import Region


# ============================================
# VIEWSET API — untuk endpoint /api/materials/
# ============================================
class MaterialViewSet(viewsets.ModelViewSet):
    """
    Endpoint: /api/materials/
    Filter:   ?region=<id>
    """
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        region_id = self.request.query_params.get('region')
        if region_id:
            qs = qs.filter(region_id=region_id)
        return qs


# ============================================
# VIEW HTML — untuk halaman dashboard (opsional)
# ============================================
def dashboard_view(request):
    """
    View HTML sederhana untuk halaman dashboard.
    Membutuhkan template: templates/pages/dashboard.html
    """
    context = {
        'total_projects': Project.objects.count(),
        'total_materials': Material.objects.count(),
        'total_labors': Labor.objects.count(),
        'total_locations': Region.objects.count(),
        'recent_projects': Project.objects
            .select_related('region')
            .order_by('-created_at')[:5],
    }
    return render(request, 'pages/dashboard.html', context)