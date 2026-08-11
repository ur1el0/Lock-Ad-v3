from django.urls import path, include
from rest_framework.routers import DefaultRouter
from navigation.views import route_preview_view, SavedRouteViewSet

router = DefaultRouter()
router.register(r'saved-routes', SavedRouteViewSet, basename='saved-route')

urlpatterns = [
    path('routes/preview/', route_preview_view, name='route-preview'),
    path('', include(router.urls)),
]
