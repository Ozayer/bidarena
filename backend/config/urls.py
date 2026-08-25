from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.accounts.urls')),
    path('api/', include('apps.tournaments.urls')),
    path('api/', include('apps.teams.urls')),
    path('api/', include('apps.players.urls')),
    path('api/', include('apps.pools.urls')),
    path('api/', include('apps.auctions.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    def frontend_view(request):
        index_path = settings.FRONTEND_DIST / 'index.html'
        if not index_path.exists():
            raise Http404
        return FileResponse(index_path.open('rb'))

    urlpatterns += [
        re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
        re_path(r'^.*$', frontend_view),
    ]
