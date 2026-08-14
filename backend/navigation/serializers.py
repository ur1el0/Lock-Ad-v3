from rest_framework import serializers

class CoordinateSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)

class RoutePreviewRequestSerializer(serializers.Serializer):
    origin = CoordinateSerializer()
    destination = CoordinateSerializer()
    profile = serializers.ChoiceField(
        choices=['foot-walking'],
        default='foot-walking',
        required=False,
    )

    def validate(self, attrs):
        if attrs['origin'] == attrs['destination']:
            raise serializers.ValidationError(
                'Origin and destination cannot be the same point.'
            )
        return attrs

from .models import SavedRoute

class SavedRouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedRoute
        fields = ['id', 'name', 'origin_lat', 'origin_lng', 'dest_lat', 'dest_lng', 'created_at']
        read_only_fields = ['id', 'created_at']