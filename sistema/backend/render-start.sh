#!/bin/sh
# Inicialização no Render (plano gratuito, sem terminal): prepara o banco e sobe o servidor.
set -e

# O valor gerado pelo Render tem 44 caracteres; duas partes somam os 50+ exigidos.
if [ -z "$DJANGO_SECRET_KEY" ]; then
  export DJANGO_SECRET_KEY="${SGS_CHAVE_1}${SGS_CHAVE_2}"
fi

python manage.py migrate --noinput
python manage.py configurar_perfis

# Primeiro administrador, só se ainda não existir.
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py shell -c "
import os
from django.contrib.auth import get_user_model
User = get_user_model()
nome = os.environ['DJANGO_SUPERUSER_USERNAME']
if not User.objects.filter(username=nome).exists():
    User.objects.create_superuser(nome, os.environ.get('DJANGO_SUPERUSER_EMAIL', ''), os.environ['DJANGO_SUPERUSER_PASSWORD'])
    print('Administrador criado.')
"
fi

exec waitress-serve --listen="0.0.0.0:${PORT:-8000}" --threads=4 --max-request-body-size=1048576 \
  --trusted-proxy='*' --trusted-proxy-headers='x-forwarded-for x-forwarded-proto' --trusted-proxy-count=1 \
  config.wsgi:application
