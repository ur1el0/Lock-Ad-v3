from rest_framework import serializers

class CoordinateSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)

class RoutePreviewRequestSerializer(serializers.Serializer):
    origin = CoordinateSerializer()
    destination = CoordinateSerializer()
    profile = serializers.ChoiceField(
        choices=['foot-walking'],
        default=['foot-walking'],
        required=False,
    )

    def validate(self, attrs):
        if attrs['origin'] == attrs['destination']:
            raise serializers.ValidationError(
                'Origin and destination cannot be the same point.'
            )
        return attrs