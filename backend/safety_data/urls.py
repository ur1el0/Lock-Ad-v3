from django.urls import path, include
from rest_framework.routers import DefaultRouter
from safety_data.views import IncidentReportViewSet, SafetySignalViewSet

router = DefaultRouter()
router.register(r'incidents', IncidentReportViewSet, basename='incident')
router.register(r'signals', SafetySignalViewSet, basename='signal')

urlpatterns = [
    path('', include(router.urls)),
]
