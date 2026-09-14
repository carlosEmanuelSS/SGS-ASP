from datetime import date
from uuid import UUID
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import F, Q
from django.http import JsonResponse
from django.utils import timezone
from alunos.views import endpoint
from .forms import AtendimentoForm, DoacaoForm
from .models import Atendimento, Doacao, RevisaoAtendimento, RevisaoDoacao


def atendimentos_visiveis(user):
    records = Atendimento.objects.all()
    if not user.has_perm('gestao.view_atendimento'):
        return records.none()
    allowed = Q(nivel='publico') | Q(autor=user)
    if user.has_perm('gestao.ler_restritos'):
        allowed |= Q(nivel='restrito')
    # Administrar contas não concede acesso aos relatos confidenciais de outros autores.
    return records.filter(allowed)


def dados(obj):
    fields = AtendimentoForm.Meta.fields if isinstance(obj, Atendimento) else DoacaoForm.Meta.fields
    result = {key: str(obj.aluno_id) if key == 'aluno' else getattr(obj, key) for key in fields}
    return {**result, 'id': str(obj.pk), 'autor': obj.autor.get_full_name() or obj.autor.username,
            'cancelado': obj.cancelado, 'versao': obj.versao, 'criado_em': obj.criado_em,
            'atualizado_em': obj.atualizado_em,
            **({'aluno_nome': obj.aluno.nome} if isinstance(obj, Atendimento) else {})}


def item(obj, user, detail=False):
    result = dados(obj)
    result['pode_editar'] = (not obj.cancelado and
        user.has_perm('gestao.change_atendimento' if isinstance(obj, Atendimento) else 'gestao.change_doacao') and
        (not isinstance(obj, Atendimento) or obj.autor_id == user.pk))
    if detail:
        result['revisoes'] = [{'versao': r.versao, 'motivo': r.motivo,
            'autor': r.autor.get_full_name() or r.autor.username, 'criado_em': r.criado_em,
            'dados': r.dados} for r in obj.revisoes.select_related('autor').all()]
    else:
        # Listagens não carregam os relatos sensíveis; detalhe exige nova autorização.
        result.pop('descricao', None)
        result.pop('encaminhamento', None)
    return result


def periodo(request):
    hoje = timezone.localdate()
    inicio = request.GET.get('inicio', hoje.replace(day=1).isoformat())
    fim = request.GET.get('fim', hoje.isoformat())
    start, end = date.fromisoformat(inicio), date.fromisoformat(fim)
    if start.isoformat() != inicio or end.isoformat() != fim or start > end or end > hoje or (end-start).days > 366:
        raise ValueError('Período inválido')
    return start, end


def listar(request, records):
    query = request.GET.get('q', '').strip()[:160]
    if records.model is Atendimento:
        records = records.select_related('autor', 'aluno').filter(aluno__nome__icontains=query)
        if request.GET.get('aluno'):
            records = records.filter(aluno_id=UUID(request.GET['aluno']))
    else:
        records = records.select_related('autor').filter(Q(doador__icontains=query) | Q(descricao__icontains=query))
    status = request.GET.get('status', '')
    if status not in ['', 'ativo', 'cancelado']:
        raise ValueError()
    if status:
        records = records.filter(cancelado=status == 'cancelado')
    if request.GET.get('inicio') or request.GET.get('fim'):
        records = records.filter(data__range=periodo(request))
    page = Paginator(records, 20).get_page(request.GET.get('page', '1'))
    return JsonResponse({'items': [item(obj, request.user) for obj in page],
        'total': page.paginator.count, 'page': page.number, 'pages': page.paginator.num_pages})


def gravar(request, form_class, obj=None):
    payload = request.payload
    extra = {'versao', 'motivo', 'cancelado'} if obj else set()
    if set(payload) - set(form_class.Meta.fields) - extra:
        return JsonResponse({'error': 'Campos desconhecidos.'}, status=400)
    if any(value is not None and not isinstance(value, str)
           for key, value in payload.items() if key in form_class.Meta.fields):
        raise ValueError()
    motivo = payload.get('motivo', '')
    if not isinstance(motivo, str) or len(motivo) > 300:
        raise ValueError()
    cancelado = payload.get('cancelado', False)
    if type(cancelado) is not bool:
        raise ValueError()
    if obj:
        if obj.cancelado:
            return JsonResponse({'error': 'Registros cancelados não podem ser alterados.'}, status=409)
        if isinstance(obj, Atendimento) and obj.autor_id != request.user.pk:
            return JsonResponse({'error': 'Somente o autor pode corrigir ou cancelar este atendimento.'}, status=403)
        if type(payload.get('versao')) is not int or not motivo.strip():
            return JsonResponse({'error': 'Informe a versão atual e o motivo da alteração.'}, status=400)
        if isinstance(obj, Atendimento) and (payload.get('aluno') != str(obj.aluno_id) or payload.get('nivel') != obj.nivel):
            return JsonResponse({'error': 'Aluno e sigilo são preservados. Cancele um registro incorreto e crie outro.'}, status=400)
    elif form_class is AtendimentoForm and payload.get('nivel') == 'restrito' and not request.user.has_perm('gestao.ler_restritos'):
        return JsonResponse({'error': 'Seu perfil não pode criar registros da equipe técnica.'}, status=403)
    form = form_class(payload, instance=obj)
    if not form.is_valid():
        return JsonResponse({'error': 'Revise os campos.', 'fields': form.errors}, status=400)
    if obj:
        updated = type(obj).objects.filter(pk=obj.pk, versao=payload['versao']).update(
            **form.cleaned_data, cancelado=cancelado, versao=F('versao') + 1, atualizado_em=timezone.now())
        if not updated:
            return JsonResponse({'error': 'Registro alterado por outra pessoa. Reabra antes de salvar.'}, status=409)
        obj.refresh_from_db()
    else:
        obj = form.save(commit=False)
        obj.autor = request.user
        obj.save()
    # JSONField usa dados primitivos e preserva todas as versões, dentro da mesma transação.
    import json
    from django.core.serializers.json import DjangoJSONEncoder
    snapshot = json.loads(json.dumps(dados(obj), cls=DjangoJSONEncoder))
    revision, fk = (RevisaoAtendimento, 'atendimento') if isinstance(obj, Atendimento) else (RevisaoDoacao, 'doacao')
    revision.objects.create(**{fk: obj}, autor=request.user, versao=obj.versao, motivo=motivo.strip(), dados=snapshot)
    return JsonResponse(item(obj, request.user, True), status=201 if obj.versao == 1 else 200)


@endpoint(['GET', 'POST'], {'GET': 'gestao.view_atendimento', 'POST': 'gestao.add_atendimento'})
def atendimentos(request):
    if request.method == 'GET':
        return listar(request, atendimentos_visiveis(request.user))
    with transaction.atomic():
        return gravar(request, AtendimentoForm)


@endpoint(['GET', 'PUT'], {'GET': 'gestao.view_atendimento', 'PUT': 'gestao.change_atendimento'})
def atendimento(request, pk):
    with transaction.atomic():
        records = atendimentos_visiveis(request.user)
        if request.method == 'PUT':
            records = records.select_for_update()
        obj = records.filter(pk=pk).first()
        if not obj:
            return JsonResponse({'error': 'Registro não encontrado ou sem acesso.'}, status=404)
        return JsonResponse(item(obj, request.user, True)) if request.method == 'GET' else gravar(request, AtendimentoForm, obj)


@endpoint(['GET', 'POST'], {'GET': 'gestao.view_doacao', 'POST': 'gestao.add_doacao'})
def doacoes(request):
    if request.method == 'GET':
        return listar(request, Doacao.objects.all())
    with transaction.atomic():
        return gravar(request, DoacaoForm)


@endpoint(['GET', 'PUT'], {'GET': 'gestao.view_doacao', 'PUT': 'gestao.change_doacao'})
def doacao(request, pk):
    with transaction.atomic():
        records = Doacao.objects.all()
        if request.method == 'PUT':
            records = records.select_for_update()
        obj = records.filter(pk=pk).first()
        if not obj:
            return JsonResponse({'error': 'Doação não encontrada.'}, status=404)
        return JsonResponse(item(obj, request.user, True)) if request.method == 'GET' else gravar(request, DoacaoForm, obj)
