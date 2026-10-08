import logging

from django.core.cache import cache
from django.db import connections
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def health_check(request):
    return Response({
        'status': 'ok',
        'service': 'lock-ad-v3-api',
    })


@api_view(['GET'])
@permission_classes([AllowAny])
@throttle_classes([])
def readiness_check(request):
    try:
        with connections['default'].cursor() as cursor:
            cursor.execute('SELECT 1')
        cache.set('healthcheck:readiness', 'ok', timeout=5)
        if cache.get('healthcheck:readiness') != 'ok':
            raise RuntimeError('Cache readiness check failed.')
    except Exception as error:
        logger.warning(
            'Readiness check failed (%s).',
            type(error).__name__,
        )
        return Response({'status': 'not_ready'}, status=503)

    return Response({
        'status': 'ready',
        'service': 'lock-ad-v3-api',
    })
