from django.contrib import admin
from .models import Building, Floor, Room, Wall, Door, Window

admin.site.register(Building)
admin.site.register(Floor)
admin.site.register(Room)
admin.site.register(Wall)
admin.site.register(Door)
admin.site.register(Window)