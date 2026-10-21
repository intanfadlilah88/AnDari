# apps/labor/views.py

from rest_framework import viewsets
from .models import Labor, LaborPrice
from .serializers import LaborSerializer, LaborPriceSerializer


class LaborViewSet(viewsets.ModelViewSet):
    queryset = Labor.objects.all()
    serializer_class = LaborSerializer


class LaborPriceViewSet(viewsets.ModelViewSet):
    queryset = LaborPrice.objects.all()
    serializer_class = LaborPriceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        region_id = self.request.query_params.get('region')
        if region_id:
            qs = qs.filter(region_id=region_id)
        return qs