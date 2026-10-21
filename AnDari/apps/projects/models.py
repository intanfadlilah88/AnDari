from django.db import models
from django.contrib.auth import get_user_model
from apps.locations.models import Region
User = get_user_model()


class Project(models.Model):
    nama_proyek = models.CharField(max_length=255)

    region = models.ForeignKey(
        Region,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects'
    )

    panjang_lahan = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Panjang lahan (meter)"
    )
    lebar_lahan = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Lebar lahan (meter)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']   # opsional: terbaru dulu

    def __str__(self):
        return self.nama_proyek