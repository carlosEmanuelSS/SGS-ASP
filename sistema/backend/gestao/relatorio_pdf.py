"""Relatório consolidado em PDF, com as mesmas seções da planilha dos Relatórios."""
from django.utils import timezone
from fpdf.fonts import FontFace
from .models import Atendimento, Doacao
from .relatorio_doacoes import Pdf, br, latin1, quantidade, reais

TIPOS = dict(Atendimento.TIPOS)
TIPOS_DOACAO = dict(Doacao.TIPOS)
CABECALHO = FontFace(emphasis='BOLD', color=(255, 255, 255), fill_color=(30, 142, 62))


def pct(parte, total):
    return f'{100 * parte / total:.1f}%'.replace('.', ',') if total else '-'


def tabela(pdf, titulo, cabecalho, linhas, larguras, alinhamento, vazio='Sem dados no período.'):
    pdf.ln(2)
    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, latin1(titulo), new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', size=9.5)
    if not linhas:
        pdf.set_text_color(100, 116, 139)
        pdf.cell(0, 7, latin1(vazio), new_x='LMARGIN', new_y='NEXT')
        return
    with pdf.table(col_widths=larguras, width=sum(larguras), align='LEFT', headings_style=CABECALHO,
                   line_height=6, text_align=alinhamento, cell_fill_color=(248, 250, 252),
                   cell_fill_mode='ROWS', repeat_headings=1) as t:
        t.row([latin1(c) for c in cabecalho])
        for linha in linhas:
            t.row([latin1(str(v)) for v in linha])


def gerar_pdf(data, doacoes=None):
    pdf = Pdf(orientation='landscape', format='A4')
    pdf.titulo_rodape = 'Relatório consolidado'
    pdf.set_margins(14, 14, 14)
    pdf.set_auto_page_break(True, margin=16)
    pdf.add_page()
    cinza = (100, 116, 139)
    gerado = timezone.localtime(data['gerado_em'])
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 9, latin1('Relatório consolidado'), new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', size=10)
    pdf.set_text_color(*cinza)
    pdf.cell(0, 6, latin1(f"Período: {br(data['inicio'])} a {br(data['fim'])} · gerado em {br(gerado)} às {gerado:%H:%M}"),
             new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    a, fr = data['alunos'], data['frequencia']
    quadros = [('Alunos ativos', str(a['ativos'])), ('Lista de espera', str(a['espera'])),
               ('Presença no período', pct(fr['presentes'], fr['total']) if fr['total'] else 'Sem chamadas')]
    if data['doacoes'] is not None:
        quadros.append(('Doações em dinheiro', reais(data['doacoes']['valor'])))
    largura = (pdf.w - pdf.l_margin - pdf.r_margin - 4 * (len(quadros) - 1)) / len(quadros)
    y = pdf.get_y()
    for i, (rotulo, valor) in enumerate(quadros):
        x = pdf.l_margin + i * (largura + 4)
        pdf.set_fill_color(240, 249, 243)
        pdf.rect(x, y, largura, 20, style='F')
        pdf.set_xy(x + 4, y + 3)
        pdf.set_font('Helvetica', size=9)
        pdf.set_text_color(*cinza)
        pdf.cell(largura - 8, 5, latin1(rotulo))
        pdf.set_xy(x + 4, y + 9)
        pdf.set_font('Helvetica', 'B', 14)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(largura - 8, 8, latin1(valor))
    pdf.set_y(y + 24)

    tabela(pdf, 'Alunos (situação atual)', ('Indicador', 'Quantidade'), [
        ('Total de alunos', a['total']), ('Ativos', a['ativos']), ('Lista de espera', a['espera']),
        ('Inativos', a['inativos']), ('Na espera há mais de 30 dias', a['espera_30_dias'])],
        (70, 30), ('LEFT', 'CENTER'))
    tabela(pdf, 'Frequência no período', ('Indicador', 'Valor'), [
        ('Marcações em chamadas', fr['total']), ('Presenças', fr['presentes']), ('Faltas', fr['faltas']),
        ('Presença', pct(fr['presentes'], fr['total']) if fr['total'] else 'Sem chamadas')],
        (70, 30), ('LEFT', 'CENTER'))
    tabela(pdf, 'Frequência por turma', ('Oficina', 'Turma', 'Educador', 'Aulas', 'Marcações', 'Presenças', 'Presença'),
           [(t['nome'], t['turma'], t['educador'], t['aulas'], t['total'], t['presentes'], pct(t['presentes'], t['total']))
            for t in data['por_turma']],
           (60, 34, 54, 22, 26, 26, 26), ('LEFT', 'LEFT', 'LEFT', 'CENTER', 'CENTER', 'CENTER', 'CENTER'),
           vazio='Nenhuma chamada registrada no período.')
    tabela(pdf, 'Ocupação atual das turmas ativas', ('Oficina', 'Turma', 'Unidade', 'Educador', 'Vagas', 'Matrículas', 'Ocupação'),
           [(o['nome'], o['turma'], o['unidade'], o['educador'], o['vagas'], o['ocupadas'], pct(o['ocupadas'], o['vagas']))
            for o in data['ocupacao']],
           (54, 30, 44, 48, 22, 26, 26), ('LEFT', 'LEFT', 'LEFT', 'LEFT', 'CENTER', 'CENTER', 'CENTER'),
           vazio='Nenhuma turma ativa.')
    tabela(pdf, 'Idade dos alunos ativos', ('Faixa etária', 'Alunos'),
           list(data['faixas'].items()), (70, 30), ('LEFT', 'CENTER'))
    tabela(pdf, 'Atendimentos no período', ('Modalidade', 'Atendimentos'),
           [(TIPOS.get(x['tipo'], x['tipo']), x['total']) for x in data['atendimentos']],
           (70, 30), ('LEFT', 'CENTER'), vazio='Nenhum atendimento acessível no período.')
    if data['doacoes'] is not None:
        tabela(pdf, 'Doações no período', ('Indicador', 'Valor'), [
            ('Doações registradas', data['doacoes']['total']),
            ('Total recebido em dinheiro', reais(data['doacoes']['valor']))], (70, 40), ('LEFT', 'RIGHT'))
        lista = list(doacoes or [])
        tabela(pdf, f'Doações recebidas no período ({len(lista)})', ('Data', 'Doador', 'Tipo', 'Valor / quantidade'),
               [(br(d.data), d.doador or 'Não informado', TIPOS_DOACAO.get(d.tipo, d.tipo),
                 reais(d.valor) if d.tipo == 'dinheiro' else quantidade(d)) for d in lista],
               (26, 80, 40, 44), ('LEFT', 'LEFT', 'LEFT', 'RIGHT'), vazio='Nenhuma doação no período.')
    pdf.ln(4)
    pdf.set_font('Helvetica', 'I', 8.5)
    pdf.set_text_color(*cinza)
    pdf.cell(0, 5, latin1('Não inclui relatos de atendimento, nomes de alunos, documentos ou dados familiares.'))
    return bytes(pdf.output())
