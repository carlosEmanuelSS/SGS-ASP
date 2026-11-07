"""Relatório detalhado de doações em planilha Excel e em PDF (para imprimir ou enviar)."""
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from fpdf import FPDF
from fpdf.fonts import FontFace
from .models import Doacao

TIPOS = dict(Doacao.TIPOS)


def br(d):
    return d.strftime('%d/%m/%Y')


def reais(v):
    # 1234.5 -> "R$ 1.234,50"
    texto = f'{Decimal(v or 0):,.2f}'.replace(',', 'X').replace('.', ',').replace('X', '.')
    return f'R$ {texto}'


def quantidade(d):
    q = d.quantidade.normalize() if d.quantidade is not None else Decimal('0')
    return f"{format(q, 'f').replace('.', ',')} {d.unidade}".strip()


def resumo(doacoes):
    """Totais das doações válidas (canceladas ficam fora) e um quadro por tipo."""
    validas = doacoes.filter(cancelado=False)
    dinheiro = validas.filter(tipo='dinheiro')
    por_tipo = []
    for tipo, rotulo in Doacao.TIPOS:
        do_tipo = validas.filter(tipo=tipo)
        if do_tipo.exists():
            total = reais(do_tipo.aggregate(v=Sum('valor'))['v']) if tipo == 'dinheiro' else '-'
            por_tipo.append((rotulo, do_tipo.count(), total))
    return {'total_dinheiro': reais(dinheiro.aggregate(v=Sum('valor'))['v']), 'em_dinheiro': dinheiro.count(),
            'em_bens': validas.exclude(tipo='dinheiro').count(),
            'doadores': validas.exclude(doador='').values('doador').distinct().count(),
            'canceladas': doacoes.filter(cancelado=True).count(), 'por_tipo': por_tipo}


def linha(d):
    return {'data': br(d.data), 'doador': d.doador or 'Não informado', 'tipo': TIPOS.get(d.tipo, d.tipo),
            'valor': reais(d.valor) if d.tipo == 'dinheiro' else quantidade(d),
            'situacao': 'Cancelada' if d.cancelado else 'Ativa', 'descricao': d.descricao,
            'autor': d.autor.get_full_name() or d.autor.username}


def gerar_xlsx(doacoes, filtros):
    """Planilha no mesmo padrão dos Relatórios: título, resumo, quadro por tipo e lista completa."""
    from io import BytesIO
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    from .planilha import VERDE, Folha
    r = resumo(doacoes)
    wb = Workbook()
    ws = wb.active
    ws.title = 'Doações'
    f = Folha(ws, colunas=8)
    f.mesclar('SGS ASP · Relatório de doações', font=Font(bold=True, size=16, color='FFFFFF'),
              fill=PatternFill('solid', fgColor=VERDE), alignment=Alignment(vertical='center'))
    ws.row_dimensions[1].height = 30
    gerado = timezone.localtime()
    f.mesclar(f'Filtros: {filtros}', font=Font(bold=True, size=11))
    f.mesclar(f'Gerado em {br(gerado)} às {gerado:%H:%M}', font=Font(color='64748B'))
    moeda = '"R$" #,##0.00'
    nota = 'Totais consideram só doações ativas.'
    if r['canceladas']:
        nota += f" {r['canceladas']} cancelada(s) aparecem na lista, mas não somam."
    f.secao('Resumo', ['Indicador', 'Valor'], [
        ['Total em dinheiro', (total_tipo(doacoes, 'dinheiro'), moeda)], ['Doações em dinheiro', r['em_dinheiro']],
        ['Doações de itens e materiais', r['em_bens']], ['Doadores identificados', r['doadores']]])
    f.mesclar(nota, font=Font(italic=True, size=9, color='64748B'))
    f.secao('Por tipo de doação', ['Tipo', 'Registros', 'Valor'],
            [[rotulo, n, (total_tipo(doacoes, tipo), moeda) if tipo == 'dinheiro' else '-']
             for tipo, rotulo, n in por_tipo(doacoes)], vazio='Nenhuma doação ativa com os filtros escolhidos.')
    inicio_lista = f.linha + 2
    f.secao(f'Doações ({doacoes.count()})',
            ['Data', 'Doador', 'Tipo', 'Valor (R$)', 'Quantidade', 'Situação', 'Descrição', 'Registrado por'],
            [[(d.data, 'DD/MM/YYYY'), d.doador or 'Não informado', TIPOS.get(d.tipo, d.tipo),
              (d.valor, moeda) if d.valor is not None else '', quantidade(d) if d.quantidade is not None else '',
              'Cancelada' if d.cancelado else 'Ativa', d.descricao, d.autor.get_full_name() or d.autor.username]
             for d in doacoes], vazio='Nenhuma doação com os filtros escolhidos.')
    # Descrição longa quebra linha em vez de invadir as colunas vizinhas; canceladas ficam em cinza.
    for linha in ws.iter_rows(min_row=inicio_lista, max_row=f.linha - 1, max_col=8):
        if linha[5].value == 'Cancelada':
            for c in linha:
                c.font = Font(color='94A3B8')
        linha[6].alignment = Alignment(wrap_text=True, vertical='top')
    for i, largura in enumerate([30, 26, 20, 16, 16, 12, 50, 22], 1):
        ws.column_dimensions[get_column_letter(i)].width = largura
    ws.page_setup.orientation = 'landscape'
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    saida = BytesIO()
    wb.save(saida)
    return saida.getvalue()


def total_tipo(doacoes, tipo):
    return doacoes.filter(cancelado=False, tipo=tipo).aggregate(v=Sum('valor'))['v'] or Decimal('0')


def por_tipo(doacoes):
    validas = doacoes.filter(cancelado=False)
    return [(tipo, rotulo, validas.filter(tipo=tipo).count()) for tipo, rotulo in Doacao.TIPOS
            if validas.filter(tipo=tipo).exists()]


TROCAS = {'“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...'}


def latin1(texto):
    """A fonte padrão do PDF cobre o português (latin-1); outros símbolos viram '?'."""
    for de, para in TROCAS.items():
        texto = texto.replace(de, para)
    return texto.encode('latin-1', 'replace').decode('latin-1')


class Pdf(FPDF):
    titulo_rodape = 'Relatório de doações'

    def footer(self):
        self.set_y(-12)
        self.set_font('Helvetica', size=8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 6, latin1(f'SGS ASP · {self.titulo_rodape} · página {self.page_no()} de {{nb}}'), align='C')


def gerar_pdf(doacoes, filtros):
    r = resumo(doacoes)
    lista = [linha(d) for d in doacoes]
    gerado = timezone.localtime()
    pdf = Pdf(orientation='landscape', format='A4')
    pdf.set_margins(14, 14, 14)
    pdf.set_auto_page_break(True, margin=16)
    pdf.add_page()
    verde, cinza = (30, 142, 62), (100, 116, 139)
    pdf.set_font('Helvetica', 'B', 18)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 9, latin1('Relatório de doações'), new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', size=10)
    pdf.set_text_color(*cinza)
    pdf.cell(0, 6, latin1(f'Ação Social do Planalto · gerado em {br(gerado)} às {gerado:%H:%M}'), new_x='LMARGIN', new_y='NEXT')
    pdf.cell(0, 6, latin1(f'Filtros: {filtros}'), new_x='LMARGIN', new_y='NEXT')
    pdf.ln(4)

    # Resumo em quatro quadros.
    quadros = [('Total em dinheiro', r['total_dinheiro']), ('Doações em dinheiro', str(r['em_dinheiro'])),
               ('Doações de itens e materiais', str(r['em_bens'])), ('Doadores identificados', str(r['doadores']))]
    largura = (pdf.w - pdf.l_margin - pdf.r_margin - 3 * 4) / 4
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
    pdf.set_font('Helvetica', size=9)
    pdf.set_text_color(*cinza)
    nota = 'Totais consideram só doações ativas.'
    if r['canceladas']:
        nota += f" {r['canceladas']} cancelada(s) aparecem na lista, mas não somam."
    pdf.cell(0, 5, latin1(nota), new_x='LMARGIN', new_y='NEXT')
    pdf.ln(3)

    cabecalho = FontFace(emphasis='BOLD', color=(255, 255, 255), fill_color=verde)
    if r['por_tipo']:
        pdf.set_font('Helvetica', 'B', 12)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(0, 8, latin1('Por tipo de doação'), new_x='LMARGIN', new_y='NEXT')
        pdf.set_font('Helvetica', size=10)
        with pdf.table(col_widths=(60, 30, 40), width=130, align='LEFT', headings_style=cabecalho,
                       line_height=6.5, text_align=('LEFT', 'CENTER', 'RIGHT')) as t:
            t.row([latin1(c) for c in ('Tipo', 'Registros', 'Valor')])
            for rotulo, n, total in r['por_tipo']:
                t.row([latin1(rotulo), str(n), latin1(total)])
        pdf.ln(5)

    pdf.set_font('Helvetica', 'B', 12)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 8, latin1(f'Doações ({len(lista)})'), new_x='LMARGIN', new_y='NEXT')
    pdf.set_font('Helvetica', size=9)
    if not lista:
        pdf.set_text_color(*cinza)
        pdf.cell(0, 8, latin1('Nenhuma doação com os filtros escolhidos.'))
    else:
        with pdf.table(col_widths=(20, 42, 24, 30, 18, 90, 36), headings_style=cabecalho, line_height=5.5,
                       cell_fill_color=(248, 250, 252), cell_fill_mode='ROWS', repeat_headings=1) as t:
            t.row([latin1(c) for c in ('Data', 'Doador', 'Tipo', 'Valor / quantidade', 'Situação', 'Descrição', 'Registrado por')])
            for d in lista:
                t.row([latin1(d[k]) for k in ('data', 'doador', 'tipo', 'valor', 'situacao', 'descricao', 'autor')])
    return bytes(pdf.output())
