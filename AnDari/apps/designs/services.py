import math
from decimal import Decimal


class QuantityCalculator:
    
    @staticmethod
    def hitung_panjang_dinding(wall):
        """Menghitung panjang dinding berdasarkan koordinat start dan end (meter)"""
        dx = wall.end_x - wall.start_x
        dy = wall.end_y - wall.start_y
        return math.hypot(dx, dy)

    @staticmethod
    def hitung_luas_bukaan_dinding(wall):
        """Menghitung total luas pintu dan jendela pada satu dinding (m²)"""
        total_pintu = sum([Decimal(str(d.lebar)) * Decimal(str(d.tinggi)) for d in wall.doors.all()])
        total_jendela = sum([Decimal(str(w.lebar)) * Decimal(str(w.tinggi)) for w in wall.windows.all()])
        return total_pintu + total_jendela

    @classmethod
    def hitung_volume_dinding(cls, wall):
        """Menghitung detail volume satu dinding"""
        panjang = Decimal(str(cls.hitung_panjang_dinding(wall)))
        tinggi = Decimal(str(wall.tinggi))
        tebal = Decimal(str(wall.tebal))

        luas_kotor = panjang * tinggi
        luas_bukaan = cls.hitung_luas_bukaan_dinding(wall)
        luas_bersih = max(Decimal('0.0'), luas_kotor - luas_bukaan)
        volume_pasangan = luas_bersih * tebal

        return {
            'wall_id': wall.id,
            'panjang_m': round(float(panjang), 2),
            'luas_kotor_m2': round(float(luas_kotor), 2),
            'luas_bukaan_m2': round(float(luas_bukaan), 2),
            'luas_bersih_m2': round(float(luas_bersih), 2),
            'volume_pasangan_m3': round(float(volume_pasangan), 2),
        }

    @staticmethod
    def hitung_luas_ruangan(room):
        """Menghitung luas lantai ruangan (m²)"""
        panjang = Decimal(str(room.panjang))
        lebar = Decimal(str(room.lebar))
        return round(float(panjang * lebar), 2)

    @classmethod
    def hitung_total_kuantitas_bangunan(cls, building):
        """Menghitung rekapitulasi kuantitas fisik untuk seluruh bangunan"""
        total_luas_lantai = Decimal('0.0')
        total_luas_dinding_bersih = Decimal('0.0')
        total_volume_dinding = Decimal('0.0')
        total_luas_bukaan = Decimal('0.0')
        total_pintu = 0
        total_jendela = 0

        for floor in building.floors.all():
            # Rekapitulasi Ruangan
            for room in floor.rooms.all():
                total_luas_lantai += Decimal(str(cls.hitung_luas_ruangan(room)))

            # Rekapitulasi Dinding
            for wall in floor.walls.all():
                vol_wall = cls.hitung_volume_dinding(wall)
                total_luas_dinding_bersih += Decimal(str(vol_wall['luas_bersih_m2']))
                total_volume_dinding += Decimal(str(vol_wall['volume_pasangan_m3']))
                total_luas_bukaan += Decimal(str(vol_wall['luas_bukaan_m2']))
                total_pintu += wall.doors.count()
                total_jendela += wall.windows.count()

        return {
            'building_id': building.id,
            'nama_bangunan': building.nama,
            'total_luas_lantai_m2': round(float(total_luas_lantai), 2),
            'total_luas_dinding_bersih_m2': round(float(total_luas_dinding_bersih), 2),
            'total_volume_dinding_m3': round(float(total_volume_dinding), 2),
            'total_luas_bukaan_m2': round(float(total_luas_bukaan), 2),
            'jumlah_pintu': total_pintu,
            'jumlah_jendela': total_jendela,
        }