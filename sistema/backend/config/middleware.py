from django.conf import settings


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=()'
        if request.path.startswith('/api/'):
            response['Cache-Control'] = 'no-store, private'
            response['Content-Security-Policy'] = "default-src 'none'; frame-ancestors 'none'"
        elif not settings.DEBUG and not request.path.startswith('/admin/'):
            response['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
        return response
