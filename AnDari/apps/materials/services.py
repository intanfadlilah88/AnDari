import requests
from django.conf import settings
from apps.locations.models import Location
from .models import Material
from apps.labor.models import Labor


class PriceSyncService:
    @staticmethod
    def sync_from_api(source_name, api_url, headers=None):
        """
        Mengambil data harga material & labor dari API eksternal 
        (Kangjati / Warungjati) lalu memperbarui DB lokal.
        """
        try:
            response = requests.get(api_url, headers=headers or {}, timeout=10)
            response.raise_for_status()
            data = response.json()

            # Asumsi format JSON dari API: 
            # { "location_city": "Bandung", "materials": [...], "labors": [...] }
            city = data.get('location_city', 'Bandung')
            location = Location.objects.filter(city__iexact=city).first()

            if not location:
                return {'status': 'error', 'message': f'Lokasi {city} belum terdaftar di AnDari'}

            # Sync Material
            for item in data.get('materials', []):
                Material.objects.update_or_create(
                    nama_material=item['nama'],
                    location=location,
                    defaults={
                        'satuan': item['satuan'],
                        'harga_satuan': item['harga'],
                        'source': source_name,
                        'external_url': item.get('url', ''),
                    }
                )

            # Sync Labor / Upah
            for labor_item in data.get('labors', []):
                Labor.objects.update_or_create(
                    tipe_pekerja=labor_item['tipe'],
                    location=location,
                    defaults={
                        'satuan': labor_item.get('satuan', 'OH'),
                        'upah_harian': labor_item['upah'],
                        'source': source_name,
                    }
                )

            return {'status': 'success', 'message': f'Data {source_name} berhasil disinkronisasi.'}

        except Exception as e:
            return {'status': 'failed', 'error': str(e)}