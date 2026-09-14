from datetime import date
from uuid import UUID
from django.contrib.auth import get_user_model
from django.core.paginator import Paginator
from django.db import IntegrityError, transaction
from django.db.models import Q, Count
from django.http import JsonResponse
from django.utils import timezone
from alunos.views import endpoint
from oficinas.models import Oficina, Matricula
from .models import Chamada, Presenca, RevisaoChamada, ResponsavelTurma, HistoricoAcesso


def erro(message, status=400):
    return JsonResponse({'error': message}, status=status)


def turmas_permitidas(user):
    records = Oficina.objects.all()
    if not user.has_perm('frequencia.ver_todas_chamadas'):
        records = records.filter(acessos_frequencia__usuario=user)
    return records


def dados_turma(o):
    return {'id': str(o.pk), 'nome': o.nome, 'turma': o.turma, 'ativa': o.ativa,
            'unidade': o.unidade, 'dias_semana': o.dias_semana, 'inicio': o.inicio, 'fim': o.fim}


def data_consulta(request):
    value = request.GET.get('data', '')
    result = date.fromisoformat(value)
    if result.isoformat() != value or result > timezone.localdate():
        raise ValueError('Data inválida')
    return result


def lista_na_data(oficina, dia):
    # Matrícula e cancelamento são inclusivos no dia local; rematrículas no mesmo
    # dia usam o vínculo mais recente para não duplicar o aluno na chamada.
    records = Matricula.objects.filter(oficina=oficina, criado_em__date__lte=dia).filter(
        Q(cancelado_em__isnull=True) | Q(cancelado_em__date__gte=dia)
    ).select_related('aluno').order_by('aluno_id', '-criado_em', '-id')
    por_aluno = {}
    for m in records:
        por_aluno.setdefault(m.aluno_id, m)
    return sorted(por_aluno.values(), key=lambda m: (m.aluno.nome, str(m.pk)))


def serialize(chamada, oficina, dia):
    if chamada:
        registros = [{'matricula_id': str(p.matricula_id), 'nome': p.nome_aluno,
            'presente': p.presente, 'justificativa': p.justificativa} for p in chamada.registros.all()]
    else:
        registros = [{'matricula_id': str(m.pk), 'nome': m.aluno.nome, 'presente': None, 'justificativa': ''}
                     for m in lista_na_data(oficina, dia)]
    return {'id': str(chamada.pk) if chamada else None, 'oficina': dados_turma(oficina), 'data': dia,
        'versao': chamada.versao if chamada else 0, 'registros': registros,
        'historico': [{'versao': r.versao, 'autor': r.autor.get_full_name() or r.autor.username,
            'motivo': r.motivo, 'criado_em': r.criado_em, 'alteracoes': r.alteracoes}
            for r in chamada.revisoes.select_related('autor').all()] if chamada else []}


@endpoint(['GET'], 'frequencia.view_chamada')
def turmas(request):
    q = request.GET.get('q', '').strip()[:160]
    records = turmas_permitidas(request.user).filter(Q(nome__icontains=q) | Q(turma__icontains=q))
    page = Paginator(records, 20).get_page(request.GET.get('page', '1'))
    return JsonResponse({'items': [dados_turma(o) for o in page], 'total': page.paginator.count,
                         'page': page.number, 'pages': page.paginator.num_pages})


@endpoint(['GET'], 'frequencia.view_chamada')
def historico(request, pk):
    if not turmas_permitidas(request.user).filter(pk=pk).exists():
        return erro('Turma não encontrada ou sem acesso.', 404)
    records = Chamada.objects.filter(oficina_id=pk).annotate(total=Count('registros'),
        presentes=Count('registros', filter=Q(registros__presente=True))).order_by('-data', 'id')
    page = Paginator(records, 20).get_page(request.GET.get('page', '1'))
    return JsonResponse({'items': [{'data': c.data, 'versao': c.versao, 'total': c.total,
        'presentes': c.presentes, 'faltas': c.total-c.presentes} for c in page],
        'page': page.number, 'pages': page.paginator.num_pages, 'total': page.paginator.count})


@endpoint(['GET', 'POST', 'PUT'], {'GET':'frequencia.view_chamada', 'POST':'frequencia.add_chamada', 'PUT':'frequencia.change_chamada'})
def chamada(request, pk):
    try:
        dia = data_consulta(request)
    except (TypeError, ValueError):
        return erro('Informe uma data válida, igual ou anterior a hoje.')
    if request.method == 'GET':
        oficina = turmas_permitidas(request.user).filter(pk=pk).first()
        if not oficina:
            return erro('Turma não encontrada ou sem acesso.', 404)
        saved = Chamada.objects.filter(oficina=oficina, data=dia).first()
        return JsonResponse(serialize(saved, oficina, dia))
    data = request.payload
    if set(data) != {'versao', 'registros', 'motivo'} or type(data['versao']) is not int:
        return erro('Informe a versão, os registros e o motivo da chamada.')
    if not isinstance(data['registros'], list) or not 1 <= len(data['registros']) <= 1000:
        return erro('A chamada precisa conter de 1 a 1000 alunos.')
    motivo = data['motivo']
    if not isinstance(motivo, str) or len(motivo) > 300 or (request.method == 'PUT' and not motivo.strip()):
        return erro('Informe o motivo da correção, com até 300 caracteres.')
    entries = {}
    for row in data['registros']:
        if not isinstance(row, dict) or set(row) != {'matricula_id', 'presente', 'justificativa'}:
            return erro('Formato de registro inválido.')
        if type(row['presente']) is not bool or not isinstance(row['justificativa'], str) or len(row['justificativa']) > 500:
            return erro('Marque presença ou falta para cada aluno. A justificativa pode ter até 500 caracteres.')
        if not isinstance(row['matricula_id'], str):
            return erro('Identificação de matrícula inválida.')
        mid = str(UUID(row['matricula_id']))
        if mid in entries:
            return erro('Uma matrícula foi informada mais de uma vez.')
        if row['presente'] and row['justificativa'].strip():
            return erro('A justificativa de falta só deve ser preenchida para alunos ausentes.')
        entries[mid] = {'presente': row['presente'], 'justificativa': row['justificativa'].strip()}
    try:
        with transaction.atomic():
            # Mesmo bloqueio utilizado nas matrículas/cancelamentos e na edição
            # de acessos, evitando lista parcial ou autorização revogada no meio da escrita.
            oficina = Oficina.objects.select_for_update().filter(pk=pk).first()
            if not oficina or not turmas_permitidas(request.user).filter(pk=pk).exists():
                return erro('Turma não encontrada ou sem acesso.', 404)
            saved = Chamada.objects.filter(oficina=oficina, data=dia).first()
            if request.method == 'POST' and saved:
                return erro('Esta turma já possui chamada nesta data. Abra a chamada para corrigir.', 409)
            if request.method == 'PUT' and not saved:
                return erro('Chamada não encontrada.', 404)
            if data['versao'] != (saved.versao if saved else 0):
                return erro('A chamada foi alterada por outra pessoa. Recarregue antes de salvar.', 409)
            if not saved and not oficina.ativa:
                return erro('Não é possível criar uma chamada para uma turma inativa.', 409)
            if saved:
                existing = {str(p.matricula_id): p for p in saved.registros.all()}
                nomes = {mid: p.nome_aluno for mid, p in existing.items()}
            else:
                existing = {}
                nomes = {str(m.pk): m.aluno.nome for m in lista_na_data(oficina, dia)}
            if set(entries) != set(nomes):
                return erro('A lista de matrículas não corresponde à chamada. Recarregue a lista; nenhum dado foi salvo.', 409)
            changes = []
            for mid, value in entries.items():
                old = {'presente': existing[mid].presente, 'justificativa': existing[mid].justificativa} if mid in existing else None
                if old != value:
                    changes.append({'matricula_id': mid, 'nome': nomes[mid], 'antes': old, 'depois': value})
            if saved and not changes:
                return erro('Nenhuma alteração foi feita na chamada.')
            if saved:
                saved.versao += 1
                saved.save(update_fields=['versao', 'atualizado_em'])
                for mid, value in entries.items():
                    Presenca.objects.filter(pk=existing[mid].pk).update(**value)
            else:
                saved = Chamada.objects.create(oficina=oficina, data=dia)
                Presenca.objects.bulk_create([Presenca(chamada=saved, matricula_id=mid, nome_aluno=nomes[mid], **value)
                                              for mid, value in entries.items()])
            RevisaoChamada.objects.create(chamada=saved, autor=request.user, versao=saved.versao,
                                         motivo=motivo.strip(), alteracoes=changes)
    except IntegrityError:
        return erro('Outra operação alterou a chamada. Recarregue e tente novamente.', 409)
    return JsonResponse(serialize(saved, oficina, dia), status=201 if request.method == 'POST' else 200)


@endpoint(['GET', 'PUT'], 'frequencia.gerir_responsaveis')
def responsaveis(request, pk):
    User = get_user_model()
    candidatos = User.objects.filter(is_active=True, groups__name='Educador').distinct().order_by('username')
    with transaction.atomic():
        oficina = Oficina.objects.select_for_update().filter(pk=pk).first()
        if not oficina:
            return erro('Turma não encontrada.', 404)
        atuais = sorted(oficina.acessos_frequencia.values_list('usuario_id', flat=True))
        if request.method == 'PUT':
            data = request.payload
            if set(data) != {'usuarios', 'anteriores'} or not isinstance(data['usuarios'], list) or not isinstance(data['anteriores'], list):
                return erro('Informe os educadores e os vínculos anteriores.')
            ids = data['usuarios']
            if len(ids) > 50 or any(type(i) is not int for i in ids+data['anteriores']) or len(ids) != len(set(ids)):
                return erro('Lista de educadores inválida.')
            if sorted(data['anteriores']) != atuais:
                return erro('Os vínculos foram alterados por outra pessoa. Recarregue a lista.', 409)
            if set(ids) != set(candidatos.filter(pk__in=ids).values_list('pk',flat=True)):
                return erro('Selecione apenas contas ativas do grupo Educador.')
            HistoricoAcesso.objects.create(oficina=oficina, autor=request.user, antes=atuais, depois=sorted(ids))
            oficina.acessos_frequencia.exclude(usuario_id__in=ids).delete()
            ResponsavelTurma.objects.bulk_create([ResponsavelTurma(oficina=oficina, usuario_id=i) for i in set(ids)-set(atuais)])
    atuais = list(oficina.acessos_frequencia.values_list('usuario_id',flat=True))
    elegiveis = set(candidatos.values_list('pk',flat=True))
    opcoes = User.objects.filter(pk__in=elegiveis | set(atuais)).order_by('username')
    return JsonResponse({'usuarios': atuais,
        'opcoes': [{'id': u.pk, 'nome': u.get_full_name() or u.username, 'usuario': u.username,
                    'disponivel': u.pk in elegiveis} for u in opcoes]})
