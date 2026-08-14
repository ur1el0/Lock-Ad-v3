from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmergencyContactViewSet

router = DefaultRouter()
router.register(r'contacts', EmergencyContactViewSet, basename='emergencycontact')

urlpatterns = [
    path('', include(router.urls)),
]
