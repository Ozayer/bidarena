"""
ASGI config for the BidArena project.

Exposes the ASGI callable as a module-level variable named ``application``,
routing HTTP requests to Django as usual and WebSocket connections to
Channels consumers for the live auction room.

Behind a TLS-terminating proxy (e.g. Render), the ASGI server itself must be
started with proxy-header support (Daphne: --proxy-headers) so it reports
the connection scheme as https to Django. Django's SECURE_PROXY_SSL_HEADER
setting alone has no effect here — ASGIRequest reads the scheme straight
from the ASGI scope, not the WSGI-style proxy header check.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

django_asgi_app = get_asgi_application()

from apps.auctions.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(URLRouter(websocket_urlpatterns)),
})
