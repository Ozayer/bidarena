from decouple import config, Csv

from .base import *  # noqa: F401,F403

DEBUG = False

ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())
CSRF_TRUSTED_ORIGINS = config('CSRF_TRUSTED_ORIGINS', cast=Csv())

SECURE_SSL_REDIRECT = True
# Render terminates TLS at its edge and forwards plain HTTP to this process;
# without this, every request looks insecure to Django and SECURE_SSL_REDIRECT
# above causes an infinite redirect loop. Daphne must also be started with
# --proxy-headers for ASGI requests to actually pick this up (see asgi.py's
# note and the Render Start Command in DEPLOYMENT.md).
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
