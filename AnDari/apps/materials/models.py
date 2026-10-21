from django.db import models
from apps.locations.models import Region


# ✅ WAJIB: Kategori Material
class MaterialCategory(models.Model):
    nama = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = 'material_categories'
        ordering = ['nama']

    def __str__(self):
        return self.nama


# ✅ WAJIB: MaterialOption (dipakai oleh Door & Window)
class MaterialOption(models.Model):
    SATUAN_CHOICES = [
        ('unit', 'Unit'),
        ('m2', 'Meter Persegi'),
        ('m3', 'Meter Kubik'),
        ('kg', 'Kilogram'),
    ]

    category = models.ForeignKey(
        MaterialCategory,
        on_delete=models.CASCADE,
        related_name='options',
    )
    nama = models.CharField(max_length=100)
    satuan = models.CharField(
        max_length=20, choices=SATUAN_CHOICES, default='unit'
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'material_options'
        unique_together = ('category', 'nama')
        ordering = ['category', 'nama']

    def __str__(self):
        return f"{self.category.nama} - {self.nama}"


# ✅ Model Material (untuk harga per daerah)
class Material(models.Model):
    SOURCE_CHOICES = [
        ('kangjati', 'KangJati'),
        ('warungjati', 'WarungJati'),
        ('manual', 'Input Manual'),
    ]

    nama_material = models.CharField(max_length=150)
    satuan = models.CharField(max_length=20)
    harga_satuan = models.DecimalField(max_digits=12, decimal_places=2)
    region = models.ForeignKey(
        Region, on_delete=models.CASCADE, related_name='materials'
    )
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default='manual'
    )
    external_url = models.URLField(max_length=500, blank=True, null=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'materials'
        ordering = ['nama_material']

    def __str__(self):
        return f"{self.nama_material} ({self.satuan}) - Rp {self.harga_satuan:,.0f}"