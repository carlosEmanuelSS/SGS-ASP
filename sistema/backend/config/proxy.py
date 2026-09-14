from ipaddress import ip_address
from django.conf import settings


def client_ip(request):
    value = request.META.get('REMOTE_ADDR', '')
    if getattr(settings, 'SECURE_PROXY_SSL_HEADER', None):
        value = request.META.get('HTTP_X_FORWARDED_FOR', value)
    try:
        return str(ip_address(value))
    except ValueError:
        return None
