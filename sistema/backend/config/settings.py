import os
from datetime import timedelta
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent
DEBUG = os.environ.get('DJANGO_DEBUG', 'false').lower() == 'true'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('Defina DJANGO_SECRET_KEY ou DJANGO_DEBUG=true para desenvolvimento.')
    SECRET_KEY = 'development-only-never-use-in-production-sgs-asp'
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
if not DEBUG and (len(SECRET_KEY) < 50 or len(set(SECRET_KEY)) < 5 or SECRET_KEY.startswith('development-')):
    raise ImproperlyConfigured('Use uma DJANGO_SECRET_KEY aleatória com pelo menos 50 caracteres.')
if not DEBUG and ('*' in ALLOWED_HOSTS or not os.environ.get('DJANGO_ALLOWED_HOSTS')):
    raise ImproperlyConfigured('Defina explicitamente os hosts permitidos, sem curinga.')
INSTALLED_APPS = [
    'django.contrib.admin', 'django.contrib.auth', 'django.contrib.contenttypes',
    'django.contrib.sessions', 'django.contrib.messages', 'django.contrib.staticfiles', 'axes', 'alunos', 'oficinas', 'frequencia', 'gestao',
]
MIDDLEWARE = [
    'config.middleware.SecurityHeadersMiddleware',
    'django.middleware.security.SecurityMiddleware', 'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware', 'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware', 'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware', 'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'axes.middleware.AxesMiddleware',
]
ROOT_URLCONF = 'config.urls'
TEMPLATES = [{'BACKEND': 'django.template.backends.django.DjangoTemplates', 'DIRS': [], 'APP_DIRS': True,
              'OPTIONS': {'context_processors': ['django.template.context_processors.request',
               'django.contrib.auth.context_processors.auth', 'django.contrib.messages.context_processors.messages']}}]
WSGI_APPLICATION = 'config.wsgi.application'
if os.environ.get('POSTGRES_HOST'):
    DATABASES = {'default': {'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.environ['POSTGRES_HOST'], 'PORT': os.environ.get('POSTGRES_PORT', '5432'),
        'NAME': os.environ.get('POSTGRES_DB', 'sgs'), 'USER': os.environ.get('POSTGRES_USER', 'sgs'),
        'PASSWORD': os.environ['POSTGRES_PASSWORD']}}
elif DEBUG:
    DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': os.environ.get('SQLITE_PATH', BASE_DIR / 'db.sqlite3')}}
else:
    raise ImproperlyConfigured('Configure PostgreSQL em produção.')
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 12}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]
LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 28800
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
CSRF_TRUSTED_ORIGINS = list(filter(None, os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',')))
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
CSRF_FAILURE_VIEW = 'alunos.views.csrf_failure'
DATA_UPLOAD_MAX_MEMORY_SIZE = 1048576
AUTHENTICATION_BACKENDS = ['axes.backends.AxesStandaloneBackend', 'django.contrib.auth.backends.ModelBackend']
AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = timedelta(minutes=15)
AXES_LOCKOUT_PARAMETERS = ['username', 'ip_address']
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_CALLABLE = 'alunos.views.lockout'
AXES_CLIENT_IP_CALLABLE = 'config.proxy.client_ip'
SECURE_REDIRECT_EXEMPT = [r'^healthz/$']
WHITENOISE_ROOT = os.environ.get('FRONTEND_DIST', BASE_DIR.parent / 'frontend' / 'dist') if not DEBUG else None
WHITENOISE_INDEX_FILE = True
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'same-origin'
if os.environ.get('TRUST_PROXY_HEADERS', 'false').lower() == 'true':
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    # Somente um proxy confiável; o backend não deve ter porta pública.
