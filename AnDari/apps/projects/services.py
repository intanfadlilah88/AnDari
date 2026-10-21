# apps/projects/services.py
from apps.materials.models import Material
from apps.labor.models import Labor, LaborPrice
class RabCalculator:
    @staticmethod
    def hitung_volume_wall(wall):
        """Menghitung volume dinding (panjang x tinggi x tebal)"""
        panjang = ((wall.end_x - wall.start_x) ** 2 + (wall.end_y - wall.start_y) ** 2) ** 0.5
        return panjang * float(wall.tinggi) * float(wall.tebal)
    
    @staticmethod
    def hitung_volume_bangunan(building):
        """Menghitung total volume semua dinding di bangunan"""
        total_volume = 0
        for floor in building.floors.all():
            for wall in floor.walls.all():
                total_volume += RabCalculator.hitung_volume_wall(wall)
        return total_volume
    
    @staticmethod
    def hitung_rab_bangunan(building):
        """Menghitung RAB berdasarkan volume dinding"""
        # Hitung volume
        volume = RabCalculator.hitung_volume_bangunan(building)
        
        # Ambil lokasi dari project
        location = building.project.location
        
        # Ambil harga material (contoh: batu bata + semen + pasir)
        # Untuk MVP, kita gunakan asumsi sederhana:
        # 1 m3 dinding membutuhkan:
        # - 500 batu bata
        # - 0.2 zak semen
        # - 0.05 m3 pasir
        # - 0.5 OH tukang batu
        # - 1 OH pekerja
        
        # Cari harga material di lokasi
        try:
            bata = Material.objects.get(nama_material='Batu Bata', location=location)
            semen = Material.objects.get(nama_material='Semen', location=location)
            pasir = Material.objects.get(nama_material='Pasir', location=location)
        except Material.DoesNotExist:
            return {'error': 'Data material tidak lengkap untuk lokasi ini'}
        
        # Cari harga tenaga kerja
        try:
            tukang = Labor.objects.get(nama_peran='Tukang Batu')
            pekerja = Labor.objects.get(nama_peran='Pekerja')
            tukang_price = LaborPrice.objects.get(labor=tukang, location=location)
            pekerja_price = LaborPrice.objects.get(labor=pekerja, location=location)
        except (Labor.DoesNotExist, LaborPrice.DoesNotExist):
            return {'error': 'Data tenaga kerja tidak lengkap untuk lokasi ini'}
        
        # Koefisien per m3 (sederhana)
        koef_bata = 500  # bh/m3
        koef_semen = 0.2  # zak/m3
        koef_pasir = 0.05  # m3/m3
        koef_tukang = 0.5  # OH/m3
        koef_pekerja = 1.0  # OH/m3
        
        # Hitung biaya
        biaya_bata = volume * koef_bata * float(bata.harga_satuan)
        biaya_semen = volume * koef_semen * float(semen.harga_satuan)
        biaya_pasir = volume * koef_pasir * float(pasir.harga_satuan)
        biaya_tukang = volume * koef_tukang * float(tukang_price.upah_per_satuan)
        biaya_pekerja = volume * koef_pekerja * float(pekerja_price.upah_per_satuan)
        
        total = biaya_bata + biaya_semen + biaya_pasir + biaya_tukang + biaya_pekerja
        
        return {
            'total_rab': total,
            'detail': {
                'volume_dinding': volume,
                'biaya_bata': biaya_bata,
                'biaya_semen': biaya_semen,
                'biaya_pasir': biaya_pasir,
                'biaya_tukang': biaya_tukang,
                'biaya_pekerja': biaya_pekerja,
            }
        }