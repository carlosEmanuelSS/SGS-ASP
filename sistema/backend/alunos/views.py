import json
import re
from functools import wraps
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.db import IntegrityError, OperationalError, connection, transaction
from django.db.models import Q, F, Count
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils import timezone
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods
from .forms import AlunoForm
from .models import Aluno, Historico
from frequencia.models import Presenca


def lockout(request, credentials=None, *args, **kwargs):
    return JsonResponse({'error': 'Muitas tentativas de acesso. Tente novamente em 15 minutos.'}, status=429)


def csrf_failure(request, reason=''):
    return JsonResponse({'error': 'Sessão de segurança inválida. Atualize a página e tente novamente.'}, status=403)


def endpoint(methods, permission=None):
    def decorate(fn):
        @never_cache
        @require_http_methods(methods)
        @wraps(fn)
        def wrapped(request, *args, **kwargs):
            if permission:
                if not request.user.is_authenticated:
                    return JsonResponse({'error': 'Entre para acessar o sistema.'}, status=401)
                codename = permission.get(request.method) if isinstance(permission, dict) else permission
                if not request.user.has_perm(codename if '.' in codename else 'alunos.' + codename):
                    return JsonResponse({'error': 'Seu usuário não tem permissão para esta operação.'}, status=403)
            try:
                request.payload = json.loads(request.body or '{}')
                if not isinstance(request.payload, dict):
                    raise ValueError()
                return fn(request, *args, **kwargs)
            except (ValueError, TypeError, UnicodeDecodeError):
                return JsonResponse({'error': 'Dados ou parâmetros inválidos.'}, status=400)
            except ValidationError as error:
                return JsonResponse({'error': 'Revise os campos.', 'fields': error.message_dict if hasattr(error, 'error_dict') else {'__all__': error.messages}}, status=400)
            except OperationalError as error:
                if connection.vendor == 'sqlite' and 'locked' in str(error).lower():
                    return JsonResponse({'error': 'Outra operação está em andamento. Atualize e tente novamente.'}, status=409)
                raise
        return wrapped
    return decorate


def user_data(user):
    return {'nome': user.get_full_name() or user.username,
            'pode_ver_atendimentos': user.has_perm('gestao.view_atendimento'),
            'pode_criar_atendimentos': user.has_perm('gestao.add_atendimento'),
            'pode_ler_restritos': user.has_perm('gestao.ler_restritos'),
            'pode_ver_doacoes': user.has_perm('gestao.view_doacao'),
            'pode_criar_doacoes': user.has_perm('gestao.add_doacao'),
            'pode_ver_indicadores': user.has_perm('gestao.ver_indicadores'),
            'administrador': user.is_staff,
            'pode_cadastrar': user.has_perm('alunos.add_aluno'),
            'pode_editar': user.has_perm('alunos.change_aluno'),
            'pode_ver_oficinas': user.has_perm('oficinas.view_oficina'),
            'pode_criar_oficinas': user.has_perm('oficinas.add_oficina'),
            'pode_editar_oficinas': user.has_perm('oficinas.change_oficina'),
            'pode_matricular': user.has_perm('oficinas.add_matricula'),
            'pode_cancelar_matricula': user.has_perm('oficinas.change_matricula'),
            'pode_ver_alunos': user.has_perm('alunos.view_aluno'),
            'pode_ver_frequencia': user.has_perm('frequencia.view_chamada'),
            'pode_criar_chamada': user.has_perm('frequencia.add_chamada'),
            'pode_corrigir_chamada': user.has_perm('frequencia.change_chamada'),
            'pode_gerir_educadores': user.has_perm('frequencia.gerir_responsaveis')}


@endpoint(['GET'])
def session(request):
    return JsonResponse({'csrf': get_token(request),
                         'user': user_data(request.user) if request.user.is_authenticated else None})


@endpoint(['POST'])
def sign_in(request):
    username = request.payload.get('username', '')
    password = request.payload.get('password', '')
    if not isinstance(username, str) or not isinstance(password, str) or len(username) > 150 or len(password) > 1024:
        return JsonResponse({'error': 'Credenciais inválidas.'}, status=400)
    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({'error': 'Usuário ou senha incorretos.'}, status=401)
    login(request, user)
    return JsonResponse({'user': user_data(user), 'csrf': get_token(request)})


@endpoint(['POST'])
def sign_out(request):
    logout(request)
    return JsonResponse({'ok': True, 'csrf': get_token(request)})


@endpoint(['POST'])
def alterar_senha(request):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'Entre para acessar o sistema.'}, status=401)
    old = request.payload.get('atual')
    new = request.payload.get('nova')
    if set(request.payload) != {'atual', 'nova'} or not all(isinstance(v, str) and 1 <= len(v) <= 1024 for v in [old, new]):
        raise ValueError()
    user = authenticate(request, username=request.user.username, password=old)
    if user is None:
        return JsonResponse({'error': 'Senha atual incorreta ou acesso temporariamente bloqueado.'}, status=400)
    validate_password(new, user)
    if new == old:
        return JsonResponse({'error': 'Escolha uma senha diferente da atual.'}, status=400)
    user.set_password(new)
    user.save(update_fields=['password'])
    update_session_auth_hash(request, user)
    return JsonResponse({'ok': True, 'csrf': get_token(request)})


def serialize(aluno):
    return {'id': str(aluno.pk), **{field: getattr(aluno, field) for field in AlunoForm.Meta.fields},
            'status': aluno.status, 'versao': aluno.versao,
            'criado_em': aluno.criado_em, 'atualizado_em': aluno.atualizado_em}


@endpoint(['GET', 'POST'], {'GET': 'view_aluno', 'POST': 'add_aluno'})
def alunos(request):
    if request.method == 'GET':
        query = request.GET.get('q', '').strip()[:160]
        status = request.GET.get('status', '')
        if status and status not in dict(Aluno.STATUS):
            return JsonResponse({'error': 'Situação inválida.'}, status=400)
        records = Aluno.objects.all()
        if query:
            predicate = Q(nome__icontains=query) | Q(responsavel__icontains=query)
            cpf = re.sub(r'\D', '', query)
            if cpf:
                predicate |= Q(cpf__contains=cpf)
            records = records.filter(predicate)
        if status:
            records = records.filter(status=status)
        page = Paginator(records, 20).get_page(request.GET.get('page', '1'))
        return JsonResponse({'items': [serialize(item) for item in page], 'total': page.paginator.count,
                             'page': page.number, 'pages': page.paginator.num_pages})
    return save_aluno(request)


@endpoint(['GET', 'PUT'], {'GET': 'view_aluno', 'PUT': 'change_aluno'})
def aluno_detail(request, pk):
    aluno = Aluno.objects.filter(pk=pk).first()
    if aluno is None:
        return JsonResponse({'error': 'Aluno não encontrado.'}, status=404)
    if request.method == 'PUT':
        return save_aluno(request, aluno)
    presencas = Presenca.objects.filter(matricula__aluno=aluno)
    resumo = presencas.aggregate(total=Count('id'), presentes=Count('id', filter=Q(presente=True)))
    resumo['faltas'] = resumo['total'] - resumo['presentes']
    resumo['registros'] = [{'data': p.chamada.data, 'oficina': p.chamada.oficina.nome,
        'turma': p.chamada.oficina.turma, 'presente': p.presente, 'justificativa': p.justificativa}
        for p in presencas.select_related('chamada__oficina').order_by('-chamada__data', '-id')[:50]]
    return JsonResponse({**serialize(aluno), 'frequencia': resumo, 'matriculas': [
        {'id': str(m.pk), 'oficina': m.oficina.nome, 'turma': m.oficina.turma,
         'ativa': m.ativa, 'criado_em': m.criado_em, 'cancelado_em': m.cancelado_em}
        for m in aluno.matriculas.select_related('oficina').all()], 'historico': [
        {'acao': event.acao, 'campos': event.campos, 'motivo': event.motivo,
         'situacao_anterior': event.situacao_anterior, 'situacao_nova': event.situacao_nova,
         'usuario': event.usuario.get_full_name() or event.usuario.username, 'criado_em': event.criado_em}
        for event in aluno.historico.select_related('usuario').all()]})


def save_aluno(request, aluno=None):
    payload = request.payload
    unknown = set(payload) - set(AlunoForm.Meta.fields) - {'status', 'versao', 'motivo'}
    if unknown:
        return JsonResponse({'error': 'O cadastro contém campos desconhecidos.'}, status=400)
    if 'programas_sociais' in payload and not isinstance(payload['programas_sociais'], bool):
        return JsonResponse({'error': 'Programas sociais deve ser sim ou não.'}, status=400)
    for field in AlunoForm.Meta.fields:
        if field != 'programas_sociais' and payload.get(field) is not None and not isinstance(payload[field], str):
            return JsonResponse({'error': 'Formato de campo inválido.'}, status=400)
    status = payload.get('status', aluno.status if aluno else 'lista_espera')
    if status not in dict(Aluno.STATUS) or (aluno is None and status != 'lista_espera'):
        return JsonResponse({'error': 'Novos alunos entram na lista de espera. Informe uma situação válida.'}, status=400)
    motivo = payload.get('motivo', '')
    if not isinstance(motivo, str) or len(motivo) > 300:
        return JsonResponse({'error': 'O motivo deve ter até 300 caracteres.'}, status=400)
    if aluno and status != aluno.status and not motivo.strip():
        return JsonResponse({'error': 'Informe o motivo da alteração de situação.'}, status=400)
    old = serialize(aluno) if aluno else None
    form = AlunoForm(payload, instance=aluno)
    if not form.is_valid():
        return JsonResponse({'error': 'Revise os campos indicados.', 'fields': form.errors}, status=400)
    try:
        with transaction.atomic():
            if aluno:
                Aluno.objects.select_for_update().get(pk=aluno.pk)
                if status != 'ativo' and aluno.matriculas.filter(ativa=True).exists():
                    return JsonResponse({'error': 'O aluno possui matrículas ativas. Cancele-as em Oficinas antes de alterar sua situação.'}, status=409)
                version = payload.get('versao')
                if type(version) is not int:
                    return JsonResponse({'error': 'Informe a versão do cadastro.'}, status=400)
                updated = Aluno.objects.filter(pk=aluno.pk, versao=version).update(
                    **form.cleaned_data, status=status, versao=F('versao') + 1, atualizado_em=timezone.now())
                if not updated:
                    return JsonResponse({'error': 'Este cadastro foi alterado por outra pessoa. Reabra a ficha antes de salvar.'}, status=409)
                aluno.refresh_from_db()
            else:
                aluno = form.save()
            changed = [key for key in [*AlunoForm.Meta.fields, 'status'] if not old or old[key] != getattr(aluno, key)]
            Historico.objects.create(aluno=aluno, usuario=request.user,
                acao='cadastro' if not old else ('situacao' if old['status'] != status else 'edicao'),
                campos=changed, motivo=motivo.strip(),
                situacao_anterior=old['status'] if old else '', situacao_nova=aluno.status)
    except IntegrityError:
        return JsonResponse({'error': 'Não foi possível salvar. Verifique se o CPF já está cadastrado.'}, status=409)
    return JsonResponse(serialize(aluno), status=200 if old else 201)
