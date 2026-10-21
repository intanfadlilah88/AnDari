from rest_framework import viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.designs.models import Building
from .models import Project
from .serializers import ProjectSerializer
from .services import RabCalculator

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer

@api_view(['GET'])
def hitung_rab_building(request, building_id):
    """Endpoint untuk menghitung RAB berdasarkan ID Building"""
    try:
        building = Building.objects.get(id=building_id)
    except Building.DoesNotExist:
        return Response({'error': 'Building tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)
    
    result = RabCalculator.hitung_rab_bangunan(building)
    if 'error' in result:
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    return Response(result)

@api_view(['GET'])
def hitung_rab_project(request, project_id):
    """Endpoint untuk menghitung total RAB seluruh building dalam satu project"""
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response({'error': 'Project tidak ditemukan'}, status=status.HTTP_404_NOT_FOUND)
    
    total_rab = 0
    all_details = []
    for building in project.buildings.all():
        result = RabCalculator.hitung_rab_bangunan(building)
        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        total_rab += result['total_rab']
        all_details.append({
            'building_id': building.id,
            'building_name': building.nama,
            'result': result
        })
    
    return Response({
        'project_id': project.id,
        'project_name': project.nama_proyek,
        'total_rab_keseluruhan': total_rab,
        'details': all_details
    })
@api_view(['GET'])
def hitung_rab_building(request, building_id):
    from apps.designs.models import Building

    region_id = request.query_params.get('region_id')
    building = Building.objects.get(id=building_id)

    return Response({
        'building_id': building.id,
        'region_id': region_id,
        'grand_total': 0,
        'formatted': 'Rp 0',
    })