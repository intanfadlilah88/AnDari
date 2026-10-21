from django.db import models
from apps.locations.models import Region


class Labor(models.Model):
    """Jenis Pekerja (misal: Tukang Batu, Tukang Kayu, Kenek/Pekerja)"""

    nama_peran = models.CharField(max_length=150, unique=True)
    kategori = models.CharField(
        max_length=100,
        help_text="Contoh: Sipil, Finishing, MEP"
    )
    satuan = models.CharField(
        max_length=20,
        default="OH",
        help_text="OH (Orang Hari) / Jam"
    )
    deskripsi = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Tenaga Kerja"
        verbose_name_plural = "Tenaga Kerja"
        ordering = ['kategori', 'nama_peran']
        db_table = 'labors'

    def __str__(self):
        return f"{self.nama_peran} ({self.kategori})"


class LaborPrice(models.Model):
    """Harga/Upah Pekerja per Lokasi dan Sumber Data"""

    SOURCE_CHOICES = [
        ('KANG_JATI', 'KangJati API'),
        ('WARUNG_JATI', 'Warung Jati API'),
        ('MANUAL', 'Input Manual / Standar Daerah'),
    ]

    labor = models.ForeignKey(
        Labor,
        on_delete=models.CASCADE,
        related_name='prices'
    )

    region = models.ForeignKey(
        Region,
        on_delete=models.CASCADE,
        related_name='labor_prices'
    )

    upah_per_satuan = models.DecimalField(max_digits=12, decimal_places=2)

    # Integrasi API Vendor
    source = models.CharField(
        max_length=50,
        choices=SOURCE_CHOICES,
        default='MANUAL'
    )
    source_ref_id = models.CharField(max_length=255, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Upah Pekerja"
        verbose_name_plural = "Upah Pekerja"
        db_table = 'labor_prices'
        unique_together = ('labor', 'region', 'source')
        ordering = ['labor', 'region']

    def __str__(self):
        # ✅ Perbaikan: 'nama_daerah' -> 'nama' (sesuai model Region)
        return (
            f"{self.labor.nama_peran} | "
            f"{self.region.nama} | "
            f"Rp{self.upah_per_satuan:,.0f}/{self.labor.satuan}"
        )