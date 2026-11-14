import warnings
from decimal import Decimal
from uuid import uuid4

from PIL import Image, UnidentifiedImageError
from django.urls import reverse as django_reverse
from rest_framework import serializers

from safety_data.models import IncidentReport, SafetySignal


MAX_INCIDENT_IMAGE_BYTES = 5 * 1024 * 1024
MAX_INCIDENT_IMAGE_PIXELS = 20_000_000
ALLOWED_INCIDENT_IMAGE_FORMATS = {'JPEG', 'PNG', 'WEBP'}
INCIDENT_IMAGE_EXTENSIONS = {
    'JPEG': 'jpg',
    'PNG': 'png',
    'WEBP': 'webp',
}


class IncidentReportSerializer(serializers.ModelSerializer):
    description = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        max_length=2000,
    )
    image = serializers.ImageField(
        required=False,
        allow_null=True,
        write_only=True,
    )
    latitude = serializers.DecimalField(
        max_digits=12,
        decimal_places=9,
        min_value=Decimal('-90'),
        max_value=Decimal('90'),
    )
    longitude = serializers.DecimalField(
        max_digits=12,
        decimal_places=9,
        min_value=Decimal('-180'),
        max_value=Decimal('180'),
    )

    class Meta:
        model = IncidentReport
        fields = [
            'id',
            'incident_type',
            'description',
            'image',
            'ai_analysis',
            'analysis_status',
            'latitude',
            'longitude',
            'status',
            'reported_at',
            'occurred_at',
        ]
        read_only_fields = [
            'ai_analysis',
            'analysis_status',
            'reported_at',
        ]

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not getattr(user, 'is_staff', False):
            fields['status'].read_only = True
        if self.instance is not None:
            fields['image'].read_only = True
        return fields

    def validate_image(self, image_file):
        if image_file.size > MAX_INCIDENT_IMAGE_BYTES:
            raise serializers.ValidationError('Image must be 5 MB or smaller.')

        image_format = None
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(image_file) as image:
                    if image.format not in ALLOWED_INCIDENT_IMAGE_FORMATS:
                        raise serializers.ValidationError(
                            'Use a JPEG, PNG, or WebP image.'
                        )
                    if image.width * image.height > MAX_INCIDENT_IMAGE_PIXELS:
                        raise serializers.ValidationError(
                            'Image dimensions are too large to process.'
                        )
                    image_format = image.format
                    image.verify()
        except serializers.ValidationError:
            raise
        except (Image.DecompressionBombError, Image.DecompressionBombWarning,
                UnidentifiedImageError, OSError, SyntaxError, ValueError):
            raise serializers.ValidationError('Upload a valid image file.')
        finally:
            image_file.seek(0)

        image_file.name = f"{uuid4().hex}.{INCIDENT_IMAGE_EXTENSIONS[image_format]}"
        return image_file

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if getattr(user, 'is_staff', False):
            data['image'] = (
                django_reverse(
                    'incident-image',
                    kwargs={'pk': instance.pk},
                )
                if instance.image
                else None
            )
        else:
            data.pop('ai_analysis', None)
            data.pop('analysis_status', None)

        return data


class SafetySignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetySignal
        fields = '__all__'


class BoundingBoxQuerySerializer(serializers.Serializer):
    min_lat = serializers.FloatField(required=False, min_value=-90, max_value=90)
    max_lat = serializers.FloatField(required=False, min_value=-90, max_value=90)
    min_lng = serializers.FloatField(required=False, min_value=-180, max_value=180)
    max_lng = serializers.FloatField(required=False, min_value=-180, max_value=180)

    def validate(self, attrs):
        fields = {'min_lat', 'max_lat', 'min_lng', 'max_lng'}
        provided_fields = set(attrs)
        if not provided_fields:
            return attrs

        missing_fields = fields - provided_fields
        if missing_fields:
            raise serializers.ValidationError({
                field: 'Required when bounding-box filtering is used.'
                for field in missing_fields
            })

        if attrs['min_lat'] >= attrs['max_lat']:
            raise serializers.ValidationError({
                'max_lat': 'Must be greater than min_lat.'
            })
        if attrs['min_lng'] >= attrs['max_lng']:
            raise serializers.ValidationError({
                'max_lng': 'Must be greater than min_lng.'
            })

        return attrs


class WeatherRequestSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


class TravelAdvisoryRequestSerializer(serializers.Serializer):
    distance = serializers.FloatField(min_value=0, max_value=1_000_000)
    duration = serializers.FloatField(min_value=0, max_value=1_000_000)
    weather_code = serializers.IntegerField(min_value=0, max_value=99)
    temperature = serializers.FloatField(min_value=-100, max_value=100)
