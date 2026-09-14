from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from alunos.models import Aluno
from alunos.views import endpoint
from .forms import OficinaForm
from .models import Oficina, Matricula, EventoOficina


def erro(message, status=400):
    return JsonResponse({'error': message}, status=status)


def serialize(oficina):
    ocupadas = getattr(oficina, 'ocupadas', None)
    if ocupadas is None:
        ocupadas = oficina.matriculas.filter(ativa=True).count()
    return {'id': str(oficina.pk), **{field: getattr(oficina, field) for field in OficinaForm.Meta.fields},
            'versao': oficina.versao, 'ocupadas': ocupadas, 'disponiveis': oficina.limite_vagas - ocupadas}


@endpoint(['GET', 'POST'], {'GET': 'oficinas.view_oficina', 'POST': 'oficinas.add_oficina'})
def oficinas(request):
    if request.method == 'POST':
        return salvar(request)
    records = Oficina.objects.annotate(ocupadas=Count('matriculas', filter=Q(matriculas__ativa=True)))
    q = request.GET.get('q', '').strip()[:160]
    if q:
        records = records.filter(Q(nome__icontains=q) | Q(turma__icontains=q) | Q(educador__icontains=q) | Q(unidade__icontains=q))
    ativa = request.GET.get('ativa', '')
    if ativa not in ('', 'true', 'false'):
        return erro('Situação inválida.')
    if ativa:
        records = records.filter(ativa=ativa == 'true')
    page = Paginator(records.order_by('nome', 'turma', 'id'), 20).get_page(request.GET.get('page', '1'))
    return JsonResponse({'items': [serialize(o) for o in page], 'total': page.paginator.count,
                         'page': page.number, 'pages': page.paginator.num_pages})


@endpoint(['GET', 'PUT'], {'GET': 'oficinas.view_oficina', 'PUT': 'oficinas.change_oficina'})
def detalhe(request, pk):
    oficina = Oficina.objects.filter(pk=pk).first()
    if not oficina:
        return erro('Oficina não encontrada.', 404)
    if request.method == 'PUT':
        return salvar(request, oficina)
    return JsonResponse({**serialize(oficina),
        'matriculas': [{'id': str(m.pk), 'aluno_id': str(m.aluno_id), 'nome': m.aluno.nome,
            'data_nascimento': m.aluno.data_nascimento, 'ativa': m.ativa, 'criado_em': m.criado_em,
            'cancelado_em': m.cancelado_em} for m in oficina.matriculas.select_related('aluno').all()],
        'historico': [{'acao': e.acao, 'motivo': e.motivo, 'criado_em': e.criado_em,
            'usuario': e.usuario.get_full_name() or e.usuario.username,
            'aluno': e.matricula.aluno.nome if e.matricula_id else ''}
            for e in oficina.historico.select_related('usuario', 'matricula__aluno').all()]})


def salvar(request, oficina=None):
    data = request.payload
    if set(data) - set(OficinaForm.Meta.fields) - {'versao', 'motivo'}:
        return erro('O cadastro contém campos desconhecidos.')
    for field in OficinaForm.Meta.fields:
        if field not in ('dias_semana', 'limite_vagas', 'ativa') and not isinstance(data.get(field, ''), str):
            return erro('Formato de campo inválido.')
    if type(data.get('ativa')) is not bool or type(data.get('limite_vagas')) is not int or not isinstance(data.get('dias_semana'), list):
        return erro('Informe situação, dias da semana e limite de vagas válidos.')
    motivo = data.get('motivo', '')
    if not isinstance(motivo, str) or len(motivo) > 300:
        return erro('O motivo deve ter até 300 caracteres.')
    created = oficina is None
    try:
        with transaction.atomic():
            if oficina:
                oficina = Oficina.objects.select_for_update().get(pk=oficina.pk)
                if type(data.get('versao')) is not int or data['versao'] != oficina.versao:
                    return erro('A turma foi alterada. Reabra a ficha antes de salvar.', 409)
                ocupadas = oficina.matriculas.filter(ativa=True).count()
                if data['limite_vagas'] < ocupadas:
                    return erro('O limite não pode ser menor que o número de matrículas ativas.', 409)
                if not data['ativa'] and ocupadas:
                    return erro('Cancele as matrículas ativas antes de inativar a turma.', 409)
                if data['ativa'] != oficina.ativa and not motivo.strip():
                    return erro('Informe o motivo da alteração de situação.')
            form = OficinaForm(data, instance=oficina)
            if not form.is_valid():
                return JsonResponse({'error': 'Revise os campos indicados.', 'fields': form.errors}, status=400)
            oficina = form.save(commit=False)
            if not created:
                oficina.versao += 1
            oficina.save()
            EventoOficina.objects.create(oficina=oficina, usuario=request.user,
                acao='cadastro' if created else 'edicao', motivo=motivo.strip())
    except IntegrityError:
        return erro('Já existe esta oficina e turma na unidade informada.', 409)
    return JsonResponse(serialize(oficina), status=201 if created else 200)


@endpoint(['GET'], 'oficinas.add_matricula')
def candidatos(request, pk):
    if not Oficina.objects.filter(pk=pk).exists():
        return erro('Oficina não encontrada.', 404)
    matriculados = Matricula.objects.filter(oficina_id=pk, ativa=True).values('aluno_id')
    records = Aluno.objects.filter(status='ativo').exclude(pk__in=matriculados)
    q = request.GET.get('q', '').strip()[:160]
    if q:
        records = records.filter(nome__icontains=q)
    page = Paginator(records, 20).get_page(request.GET.get('page', '1'))
    return JsonResponse({'items': [{'id': str(a.pk), 'nome': a.nome, 'data_nascimento': a.data_nascimento} for a in page],
        'total': page.paginator.count, 'page': page.number, 'pages': page.paginator.num_pages})


@endpoint(['POST'], 'oficinas.add_matricula')
def matricular(request, pk):
    if set(request.payload) != {'aluno_id'}:
        return erro('Informe apenas o aluno a matricular.')
    try:
        with transaction.atomic():
            # Ordem de bloqueio: aluno e depois oficina. Todas as entradas seguem a mesma ordem.
            aluno = Aluno.objects.select_for_update().filter(pk=request.payload['aluno_id']).first()
            oficina = Oficina.objects.select_for_update().filter(pk=pk).first()
            if not aluno or not oficina:
                return erro('Aluno ou oficina não encontrado.', 404)
            if aluno.status != 'ativo':
                return erro('Somente alunos ativos podem ser matriculados.', 409)
            if not oficina.ativa:
                return erro('Esta turma está inativa.', 409)
            if oficina.matriculas.filter(aluno=aluno, ativa=True).exists():
                return erro('O aluno já está matriculado nesta turma.', 409)
            if oficina.matriculas.filter(ativa=True).count() >= oficina.limite_vagas:
                return erro('A turma está lotada. Nenhuma matrícula foi realizada.', 409)
            matricula = Matricula.objects.create(aluno=aluno, oficina=oficina)
            oficina.versao += 1
            oficina.save(update_fields=['versao', 'atualizado_em'])
            EventoOficina.objects.create(oficina=oficina, matricula=matricula, usuario=request.user, acao='matricula')
    except IntegrityError:
        return erro('A matrícula já foi realizada. Atualize a ficha.', 409)
    return JsonResponse({'id': str(matricula.pk)}, status=201)


@endpoint(['POST'], 'oficinas.change_matricula')
def cancelar(request, pk, matricula_id):
    motivo = request.payload.get('motivo', '')
    if set(request.payload) != {'motivo'} or not isinstance(motivo, str) or not motivo.strip() or len(motivo) > 300:
        return erro('Informe um motivo de cancelamento com até 300 caracteres.')
    with transaction.atomic():
        oficina = Oficina.objects.select_for_update().filter(pk=pk).first()
        if not oficina:
            return erro('Oficina não encontrada.', 404)
        matricula = oficina.matriculas.filter(pk=matricula_id).first()
        if not matricula:
            return erro('Matrícula não encontrada nesta turma.', 404)
        if not matricula.ativa:
            return erro('Esta matrícula já foi cancelada.', 409)
        matricula.ativa = False
        matricula.cancelado_em = timezone.now()
        matricula.save(update_fields=['ativa', 'cancelado_em'])
        oficina.versao += 1
        oficina.save(update_fields=['versao', 'atualizado_em'])
        EventoOficina.objects.create(oficina=oficina, matricula=matricula, usuario=request.user,
            acao='cancelamento', motivo=motivo.strip())
    return JsonResponse({'ok': True})
