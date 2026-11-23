from urllib.parse import parse_qsl, unquote, urlsplit


def banco_da_url(url):
    """Converte uma URL postgres:// (formato do Neon e do Render) na configuração do Django."""
    partes = urlsplit(url)
    if partes.scheme not in ('postgres', 'postgresql') or not partes.hostname or not partes.path.strip('/'):
        raise ValueError('DATABASE_URL deve ser postgresql://usuario:senha@host/banco')
    return {'ENGINE': 'django.db.backends.postgresql', 'HOST': partes.hostname,
            'PORT': str(partes.port or 5432), 'NAME': unquote(partes.path.lstrip('/')),
            'USER': unquote(partes.username or ''), 'PASSWORD': unquote(partes.password or ''),
            # Parâmetros como sslmode=require seguem para o driver.
            'OPTIONS': dict(parse_qsl(partes.query))}
