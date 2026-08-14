from django.db import models
from django.conf import settings

class SavedRoute(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='saved_routes')
    name = models.CharField(max_length=100)
    origin_lat = models.FloatField()
    origin_lng = models.FloatField()
    dest_lat = models.FloatField()
    dest_lng = models.FloatField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"
