from django.urls import path, include
from rest_framework.routers import DefaultRouter
from safety_data.views import IncidentReportViewSet, SafetySignalViewSet, get_weather

router = DefaultRouter()
router.register(r'incidents', IncidentReportViewSet, basename='incident')
router.register(r'signals', SafetySignalViewSet, basename='signal')

urlpatterns = [
    path('weather/', get_weather, name='get_weather'),
    path('', include(router.urls)),
]
