from rest_framework import  serializers
from safety_data.models import IncidentReport, SafetySignal

class IncidentReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentReport
        fields = '__all__'
        read_only_fields = ['user', 'ai_analysis']

class SafetySignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SafetySignal
        fields = '__all__'
