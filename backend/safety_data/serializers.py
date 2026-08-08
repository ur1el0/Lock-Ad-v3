from os import read
from rest_framework import  serializers
from .models import IncidentReport, SafetySignal

class IncidentReportSerializer(serializers.Serializer):
    class Meta:
        model = IncidentReport
        fields = '__all__'
        read_only_fields = ['user']

class SafetySignalSerializer(serializers.Serializer):
    class Meta:
        model = SafetySignal
        fields = '__all__'
        