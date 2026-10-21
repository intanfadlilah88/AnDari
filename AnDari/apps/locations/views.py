from rest_framework import viewsets
from .models import Region
from .serializers import RegionSerializer


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only: user hanya bisa lihat daftar region,
    tidak bisa tambah/edit/hapus dari aplikasi mobile.
    """
    queryset = Region.objects.filter(is_active=True).order_by('nama')
    serializer_class = RegionSerializer