from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from navigation.serializers import RoutePreviewRequestSerializer
from navigation.services import get_route_preview, RoutingConfigurationError, RoutingProviderError


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