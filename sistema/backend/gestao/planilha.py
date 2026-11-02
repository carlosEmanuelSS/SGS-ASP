"""Relatório consolidado em planilha Excel, já formatada para leitura e impressão."""
from decimal import Decimal
from io import BytesIO
from django.utils import timezone
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from .models import Atendimento

VERDE = '1E8E3E'
VERDE_CLARO = 'E8F5EC'
CINZA = 'F1F5F9'
BORDA = Border(*(Side(style='thin', color='CBD5E1'),) * 4)
COLUNAS = 7
LARGURAS = [34, 24, 18, 24, 14, 16, 16]
TIPOS = dict(Atendimento.TIPOS)


def br(d):
    return d.strftime('%d/%m/%Y')


class Folha:
    """Escreve blocos (título + tabela) um abaixo do outro, com estilo consistente."""

    def __init__(self, ws):
        self.ws = ws
        self.linha = 1

    def celula(self, col, valor, **estilo):
        c = self.ws.cell(row=self.linha, column=col, value=valor)
        # Texto que começa com "=" vira fórmula no Excel; forçar texto evita injeção.
        if isinstance(valor, str):
            c.data_type = 's'
        for nome, v in estilo.items():
            setattr(c, nome, v)
        return c

    def mesclar(self, valor, **estilo):
        self.celula(1, valor, **estilo)
        self.ws.merge_cells(start_row=self.linha, start_column=1, end_row=self.linha, end_column=COLUNAS)
        self.linha += 1

    def secao(self, titulo, cabecalho, linhas, formatos=None, vazio='Sem dados no período.'):
        self.linha += 1
        self.mesclar(titulo, font=Font(bold=True, size=12, color=VERDE), fill=PatternFill('solid', fgColor=VERDE_CLARO))
        for i, nome in enumerate(cabecalho, 1):
            self.celula(i, nome, font=Font(bold=True, color='334155'), fill=PatternFill('solid', fgColor=CINZA),
                        border=BORDA, alignment=Alignment(horizontal='left' if i == 1 else 'center', vertical='center'))
        self.linha += 1
        if not linhas:
            self.mesclar(vazio, font=Font(italic=True, color='64748B'))
            return
        for valores in linhas:
            for i, v in enumerate(valores, 1):
                # Um valor pode vir como (valor, formato) quando só aquela célula tem formato próprio.
                v, formato = v if isinstance(v, tuple) else (v, (formatos or {}).get(i))
                c = self.celula(i, v, border=BORDA,
                                alignment=Alignment(horizontal='left' if isinstance(v, str) else 'center'))
                if formato and v is not None and not isinstance(v, str):
                    c.number_format = formato
            self.linha += 1


def pct(parte, total):
    return parte / total if total else None


def gerar(data):
    wb = Workbook()
    ws = wb.active
    ws.title = 'Relatório'
    f = Folha(ws)
    f.mesclar('SGS ASP · Relatório consolidado', font=Font(bold=True, size=16, color='FFFFFF'),
              fill=PatternFill('solid', fgColor=VERDE), alignment=Alignment(vertical='center'))
    ws.row_dimensions[1].height = 30
    gerado = timezone.localtime(data['gerado_em'])
    f.mesclar(f"Período: {br(data['inicio'])} a {br(data['fim'])}", font=Font(bold=True, size=11))
    f.mesclar(f"Gerado em {br(gerado)} às {gerado:%H:%M}", font=Font(color='64748B'))

    a = data['alunos']
    f.secao('Alunos (situação atual)', ['Indicador', 'Quantidade'], [
        ['Total de alunos', a['total']], ['Ativos', a['ativos']], ['Lista de espera', a['espera']],
        ['Inativos', a['inativos']], ['Na espera há mais de 30 dias', a['espera_30_dias']]])

    fr = data['frequencia']
    f.secao('Frequência no período', ['Indicador', 'Valor'], [
        ['Marcações em chamadas', fr['total']], ['Presenças', fr['presentes']], ['Faltas', fr['faltas']],
        ['Presença', (pct(fr['presentes'], fr['total']), '0.0%') if fr['total'] else 'Sem chamadas']])

    f.secao('Frequência por turma',
            ['Oficina', 'Turma', 'Educador', 'Aulas', 'Marcações', 'Presenças', 'Presença'],
            [[t['nome'], t['turma'], t['educador'], t['aulas'], t['total'], t['presentes'],
              pct(t['presentes'], t['total'])] for t in data['por_turma']],
            formatos={7: '0.0%'}, vazio='Nenhuma chamada registrada no período.')

    f.secao('Ocupação atual das turmas ativas',
            ['Oficina', 'Turma', 'Unidade', 'Educador', 'Vagas', 'Matrículas', 'Ocupação'],
            [[o['nome'], o['turma'], o['unidade'], o['educador'], o['vagas'], o['ocupadas'],
              pct(o['ocupadas'], o['vagas'])] for o in data['ocupacao']],
            formatos={7: '0%'}, vazio='Nenhuma turma ativa.')

    f.secao('Idade dos alunos ativos', ['Faixa etária', 'Alunos'],
            [[faixa, total] for faixa, total in data['faixas'].items()])

    f.secao('Atendimentos no período', ['Modalidade', 'Atendimentos'],
            [[TIPOS.get(x['tipo'], x['tipo']), x['total']] for x in data['atendimentos']],
            vazio='Nenhum atendimento acessível no período.')

    if data['doacoes'] is not None:
        f.secao('Doações no período', ['Indicador', 'Valor'], [
            ['Doações registradas', data['doacoes']['total']],
            ['Total recebido em dinheiro', (Decimal(data['doacoes']['valor']), '"R$" #,##0.00')]])

    f.linha += 1
    f.mesclar('Não inclui relatos de atendimento, nomes de alunos, documentos ou dados familiares.',
              font=Font(italic=True, size=9, color='64748B'))
    for i, largura in enumerate(LARGURAS, 1):
        ws.column_dimensions[get_column_letter(i)].width = largura
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True
    saida = BytesIO()
    wb.save(saida)
    return saida.getvalue()
