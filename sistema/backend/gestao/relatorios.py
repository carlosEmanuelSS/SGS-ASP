import csv
from datetime import timedelta
from decimal import Decimal
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncWeek
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from alunos.models import Aluno
from alunos.views import endpoint
from oficinas.models import Oficina
from frequencia.models import Presenca
from .models import Doacao
from .views import atendimentos_visiveis, periodo


def resumo(request):
    inicio, fim = periodo(request)
    oficinas = Oficina.objects.all()
    oficina = request.GET.get('oficina', '').strip()
    educador = request.GET.get('educador', '').strip()[:160]
    if oficina:
        from uuid import UUID
        oficinas = oficinas.filter(pk=UUID(oficina))
    if educador:
        oficinas = oficinas.filter(educador__icontains=educador)
    presencas = Presenca.objects.filter(chamada__data__range=(inicio, fim), chamada__oficina__in=oficinas)
    totais = presencas.aggregate(total=Count('id'), presentes=Count('id', filter=Q(presente=True)))
    totais['faltas'] = totais['total'] - totais['presentes']
    totais['percentual'] = round(100 * totais['presentes'] / totais['total'], 1) if totais['total'] else None
    alunos = Aluno.objects.all()
    ativos = alunos.filter(status='ativo')
    hoje = timezone.localdate()
    faixas = {'0 a 6 anos': 0, '7 a 10 anos': 0, '11 a 14 anos': 0, '15 a 17 anos': 0, '18+ anos': 0}
    for nasc in ativos.values_list('data_nascimento', flat=True).iterator():
        idade = hoje.year - nasc.year - ((hoje.month, hoje.day) < (nasc.month, nasc.day))
        key = '0 a 6 anos' if idade < 7 else '7 a 10 anos' if idade < 11 else '11 a 14 anos' if idade < 15 else '15 a 17 anos' if idade < 18 else '18+ anos'
        faixas[key] += 1
    ocupacao = [{'id': str(o.pk), 'nome': o.nome, 'turma': o.turma, 'unidade': o.unidade,
        'educador': o.educador, 'vagas': o.limite_vagas, 'ocupadas': o.ocupadas}
        for o in oficinas.filter(ativa=True).annotate(ocupadas=Count('matriculas', filter=Q(matriculas__ativa=True)))]
    # Os alertas são contagens no período, não diagnóstico nem faltas consecutivas.
    alertas = list(presencas.filter(matricula__aluno__status='ativo').values(
        'matricula__aluno_id', 'matricula__aluno__nome').annotate(
        faltas=Count('id', filter=Q(presente=False)), aulas=Count('id')).filter(faltas__gte=3).order_by('-faltas', 'matricula__aluno__nome')[:100])
    semanas = presencas.annotate(semana=TruncWeek('chamada__data')).values('semana').annotate(
        total=Count('id'), presentes=Count('id', filter=Q(presente=True))).order_by('semana')
    por_turma = presencas.values('chamada__oficina_id', 'chamada__oficina__nome', 'chamada__oficina__turma',
        'chamada__oficina__educador').annotate(aulas=Count('chamada', distinct=True), total=Count('id'),
        presentes=Count('id', filter=Q(presente=True))).order_by('chamada__oficina__nome', 'chamada__oficina__turma')
    atendimentos = atendimentos_visiveis(request.user).filter(cancelado=False, data__range=(inicio, fim))
    doacoes = Doacao.objects.filter(cancelado=False, data__range=(inicio, fim))
    espera = alunos.filter(status='lista_espera')
    return {
        'inicio': inicio, 'fim': fim, 'gerado_em': timezone.now(),
        'alunos': {'total': alunos.count(), 'ativos': ativos.count(), 'espera': espera.count(),
                   'inativos': alunos.filter(status='inativo').count(),
                   'espera_30_dias': espera.filter(criado_em__lt=timezone.now() - timedelta(days=30)).count()},
        'ocupacao': ocupacao, 'frequencia': totais, 'faixas': faixas,
        'semanas': [{'inicio': s['semana'], 'total': s['total'], 'presentes': s['presentes']} for s in semanas],
        'por_turma': [{'id': str(t['chamada__oficina_id']), 'nome': t['chamada__oficina__nome'],
                       'turma': t['chamada__oficina__turma'], 'educador': t['chamada__oficina__educador'],
                       'aulas': t['aulas'], 'total': t['total'], 'presentes': t['presentes']} for t in por_turma],
        'alertas': [{'aluno': str(a['matricula__aluno_id']), 'nome': a['matricula__aluno__nome'],
                     'faltas': a['faltas'], 'aulas': a['aulas']} for a in alertas],
        'atendimentos': list(atendimentos.values('tipo').annotate(total=Count('id')).order_by('tipo')),
        'doacoes': {'total': doacoes.count(), 'valor': str((doacoes.filter(tipo='dinheiro').aggregate(valor=Sum('valor'))['valor'] or Decimal('0')).quantize(Decimal('0.01')))}
                   if request.user.has_perm('gestao.view_doacao') else None,
    }


def celula(value):
    value = str(value)
    if value.lstrip().startswith(('=', '+', '-', '@')) or any(c in value for c in ['\t', '\r', '\n']):
        return "'" + value
    return value


@endpoint(['GET'], 'gestao.ver_indicadores')
def relatorio(request):
    data = resumo(request)
    formato = request.GET.get('formato', 'json')
    if formato == 'json':
        return JsonResponse(data)
    if formato != 'csv':
        raise ValueError()
    response = HttpResponse(content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="relatorio-sgs.csv"'
    response.write('\ufeff')
    writer = csv.writer(response, delimiter=';', quoting=csv.QUOTE_ALL)
    def row(*values):
        writer.writerow([celula(v) for v in values])
    row('SGS ASP', 'Relatório consolidado')
    row('Período', data['inicio'], data['fim'])
    row('Gerado em', data['gerado_em'])
    row('Alunos (situação atual)', 'Total', 'Ativos', 'Lista de espera', 'Inativos', 'Na espera há mais de 30 dias')
    row('', *data['alunos'].values())
    row('Frequência no período', 'Marcações', 'Presenças', 'Faltas', 'Presença %')
    row('', data['frequencia']['total'], data['frequencia']['presentes'], data['frequencia']['faltas'],
        data['frequencia']['percentual'] if data['frequencia']['percentual'] is not None else 'Sem chamadas')
    row('Frequência por turma', 'Oficina', 'Turma', 'Educador', 'Aulas', 'Marcações', 'Presenças')
    for t in data['por_turma']:
        row('', t['nome'], t['turma'], t['educador'], t['aulas'], t['total'], t['presentes'])
    row('Ocupação atual', 'Oficina', 'Turma', 'Unidade', 'Educador', 'Vagas', 'Matrículas ativas')
    for o in data['ocupacao']:
        row('', o['nome'], o['turma'], o['unidade'], o['educador'], o['vagas'], o['ocupadas'])
    row('Idades atuais dos alunos ativos', 'Faixa', 'Total')
    for faixa, total in data['faixas'].items():
        row('', faixa, total)
    row('Atendimentos acessíveis no período', 'Tipo', 'Total')
    for a in data['atendimentos']:
        row('', a['tipo'], a['total'])
    if data['doacoes'] is not None:
        row('Doações no período', 'Registros', 'Valor em dinheiro (R$)')
        row('', data['doacoes']['total'], data['doacoes']['valor'])
    # Não exporta relatos, nomes de alunos, documentos ou dados familiares.
    return response
