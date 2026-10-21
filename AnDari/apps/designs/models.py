# apps/designs/models.py

from django.db import models
from django.core.validators import MinValueValidator
from apps.projects.models import Project


# ============================================
# BUILDING
# ============================================
class Building(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='buildings',
    )
    nama = models.CharField(max_length=100, default="Bangunan Utama")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'buildings'
        ordering = ['id']

    def __str__(self):
        return f"{self.nama} - {self.project.nama_proyek}"


# ============================================
# FLOOR
# ============================================
class Floor(models.Model):
    building = models.ForeignKey(
        Building,
        on_delete=models.CASCADE,
        related_name='floors',
    )
    level = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Lantai ke-N (mulai 1)",
    )
    tinggi_dinding = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=3.00,
        validators=[MinValueValidator(0)],
        help_text="Tinggi lantai (meter)",
    )

    class Meta:
        db_table = 'floors'
        ordering = ['building', 'level']
        # ✅ Satu building tidak boleh punya 2 lantai dengan level sama
        unique_together = ('building', 'level')

    def __str__(self):
        return f"Lantai {self.level} - {self.building.nama}"


# ============================================
# ROOM
# ============================================
class Room(models.Model):
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name='rooms',
    )
    nama = models.CharField(
        max_length=100,
        help_text="Contoh: Kamar Utama, Dapur",
    )
    x = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0)],
        help_text="Koordinat X (meter, dari 0)",
    )
    y = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0)],
        help_text="Koordinat Y (meter, dari 0)",
    )
    panjang = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0.1)],
        help_text="Panjang ruangan (meter)",
    )
    lebar = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(0.1)],
        help_text="Lebar ruangan (meter)",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'rooms'
        ordering = ['id']
        indexes = [
            models.Index(fields=['floor']),
        ]

    def __str__(self):
        return f"{self.nama} ({self.panjang}m × {self.lebar}m)"

    @property
    def luas(self):
        """Luas ruangan dalam m²."""
        return float(self.panjang) * float(self.lebar)


# ============================================
# WALL
# ============================================
class Wall(models.Model):
    floor = models.ForeignKey(
        Floor,
        on_delete=models.CASCADE,
        related_name='walls',
    )
    start_x = models.FloatField(help_text="Titik awal X (meter)")
    start_y = models.FloatField(help_text="Titik awal Y (meter)")
    end_x = models.FloatField(help_text="Titik akhir X (meter)")
    end_y = models.FloatField(help_text="Titik akhir Y (meter)")
    tebal = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.15,
        validators=[MinValueValidator(0)],
        help_text="Tebal dinding (meter)",
    )
    tinggi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=3.0,
        validators=[MinValueValidator(0)],
        help_text="Tinggi dinding (meter)",
    )

    class Meta:
        db_table = 'walls'
        ordering = ['id']
        indexes = [
            models.Index(fields=['floor']),
        ]

    def __str__(self):
        return f"Wall [{self.start_x},{self.start_y}] → [{self.end_x},{self.end_y}]"


# ============================================
# DOOR
# ============================================
class Door(models.Model):
    wall = models.ForeignKey(
        Wall,
        on_delete=models.CASCADE,
        related_name='doors',
    )
    offset = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0)],
        help_text="Jarak dari titik awal dinding (meter)",
    )
    lebar = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.90,
        validators=[MinValueValidator(0.1)],
        help_text="Lebar pintu (meter)",
    )
    tinggi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=2.10,
        validators=[MinValueValidator(0.1)],
        help_text="Tinggi pintu (meter)",
    )
    # ✅ Tambah material — supaya user bisa ganti pintu di halaman RAB
    material = models.ForeignKey(
        'materials.MaterialOption',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='doors',
        limit_choices_to={'category__nama': 'Pintu'},
        help_text="Material pintu (kayu, aluminium, dll)",
    )

    class Meta:
        db_table = 'doors'
        ordering = ['id']

    def __str__(self):
        return f"Pintu ({self.lebar}m × {self.tinggi}m)"


# ============================================
# WINDOW
# ============================================
class Window(models.Model):
    wall = models.ForeignKey(
        Wall,
        on_delete=models.CASCADE,
        related_name='windows',
    )
    offset = models.FloatField(
        default=0.0,
        validators=[MinValueValidator(0)],
        help_text="Jarak dari titik awal dinding (meter)",
    )
    lebar = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.20,
        validators=[MinValueValidator(0.1)],
        help_text="Lebar jendela (meter)",
    )
    tinggi = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=1.50,
        validators=[MinValueValidator(0.1)],
        help_text="Tinggi jendela (meter)",
    )
    # ✅ Tambah material — supaya user bisa ganti jendela di halaman RAB
    material = models.ForeignKey(
        'materials.MaterialOption',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='windows',
        limit_choices_to={'category__nama': 'Jendela'},
        help_text="Material jendela (kayu, aluminium, dll)",
    )

    class Meta:
        db_table = 'windows'
        ordering = ['id']

    def __str__(self):
        return f"Jendela ({self.lebar}m × {self.tinggi}m)"