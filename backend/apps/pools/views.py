from rest_framework import viewsets

from .models import Pool
from .serializers import PoolSerializer


class PoolViewSet(viewsets.ModelViewSet):
    queryset = Pool.objects.all()
    serializer_class = PoolSerializer
    filterset_fields = ['tournament', 'pool_type', 'status']
    search_fields = ['name']
