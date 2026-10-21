# apps/locations/models.py

from django.db import models


class Region(models.Model):
    nama = models.CharField(max_length=100, unique=True)
    provinsi = models.CharField(max_length=100, blank=True, null=True)
    kode = models.CharField(max_length=10, blank=True, null=True, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'regions'
        ordering = ['nama']

    def __str__(self):
        return self.nama