"""Entrada no dashboard do outro grupo com ingresso validador (ADR-003 do DashBordASP).

Gera um JWT HS256 de 60 segundos e uso único, assinado com DASHBOARD_SSO_SEGREDO,
e redireciona para <DASHBOARD_URL>/sso#ticket=<ingresso>.
"""
import time
import uuid

import jwt
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET


@never_cache
@require_GET
def entrar_dashboard(request):
    user = request.user
    if not user.is_authenticated or not user.has_perm('gestao.ver_indicadores'):
        return redirect('/')
    segredo, destino = settings.DASHBOARD_SSO_SEGREDO, settings.DASHBOARD_URL.rstrip('/')
    if not segredo or not destino:
        return HttpResponse('O acesso ao dashboard ainda não foi configurado.', status=503,
                            content_type='text/plain; charset=utf-8')
    papeis = ['analista']
    if user.groups.filter(name='Coordenação').exists():
        papeis.append('coordenacao_pedagogica')
    agora = int(time.time())
    ingresso = jwt.encode(
        {'iss': 'gestao-asp', 'aud': 'asp-dashboard-sso', 'sub': str(user.pk),
         'nome': user.get_full_name() or user.username, 'papeis': papeis,
         'iat': agora, 'exp': agora + 60, 'jti': uuid.uuid4().hex},
        segredo, algorithm='HS256')
    return redirect(f'{destino}/sso#ticket={ingresso}')
