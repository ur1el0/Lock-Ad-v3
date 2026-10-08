from django.urls import path
from .views import health_check, readiness_check

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('health/ready/', readiness_check, name='readiness-check'),
]
