from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from navigation.serializers import RoutePreviewRequestSerializer
from navigation.services import get_route_preview, RoutingConfigurationError, RoutingProviderError
from rest_framework import viewsets, permissions
from .models import SavedRoute
from .serializers import SavedRouteSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def route_preview_view(request):
    serializer = RoutePreviewRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    validated_data = serializer.validated_data
    origin = validated_data['origin']
    destination = validated_data['destination']
    profile = validated_data['profile']

    try:
        result = get_route_preview(origin, destination, profile)
        return Response(result, status=status.HTTP_200_OK)
    except RoutingConfigurationError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except RoutingProviderError as e:
        return Response(
            {'detail': str(e)},
            status=status.HTTP_502_BAD_GATEWAY
        )


class SavedRouteViewSet(viewsets.ModelViewSet):
    serializer_class = SavedRouteSerializer
    
    def get_permissions(self):
        """
        Require IsAdminUser for destructive actions.
        Standard users can only list, retrieve, or create.
        """

        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [permissions.IsAdminUser]
        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """
        QuerySet Isolation:
        Moderators see all routes. Users only their own.
        """

        user = self.request.user
        if user.is_staff:
            return SavedRoute.objects.all().order_by('-created_at')
        return SavedRoute.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)