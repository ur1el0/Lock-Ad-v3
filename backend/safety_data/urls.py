from django.urls import path, include
from rest_framework.routers import DefaultRouter
from safety_data.views import (
    IncidentImageView,
    IncidentReportViewSet,
    SafetySignalViewSet,
    generate_advisory,
    get_weather,
)

router = DefaultRouter()
router.register(r'incidents', IncidentReportViewSet, basename='incident')
router.register(r'signals', SafetySignalViewSet, basename='signal')

urlpatterns = [
    path('weather/', get_weather, name='get_weather'),
    path('advisory/', generate_advisory, name='generate_advisory'),
    path('incidents/<int:pk>/image/', IncidentImageView.as_view(), name='incident-image'),
    path('', include(router.urls)),
]
