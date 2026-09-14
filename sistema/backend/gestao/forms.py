from django import forms
from django.utils import timezone
from .models import Atendimento, Doacao


class DataPassada:
    def clean_data(self):
        value = self.cleaned_data['data']
        if value > timezone.localdate():
            raise forms.ValidationError('A data não pode ser futura.')
        return value


class AtendimentoForm(DataPassada, forms.ModelForm):
    class Meta:
        model = Atendimento
        fields = ['aluno', 'data', 'tipo', 'nivel', 'descricao', 'encaminhamento']

    def clean_data(self):
        value = super().clean_data()
        aluno = self.cleaned_data.get('aluno')
        if aluno and value < aluno.data_nascimento:
            raise forms.ValidationError('A data não pode ser anterior ao nascimento do aluno.')
        return value


class DoacaoForm(DataPassada, forms.ModelForm):
    class Meta:
        model = Doacao
        fields = ['data', 'tipo', 'doador', 'descricao', 'valor', 'quantidade', 'unidade']

    def clean(self):
        data = super().clean()
        if data.get('tipo') == 'dinheiro':
            if not data.get('valor') or data['valor'] <= 0:
                self.add_error('valor', 'Informe um valor maior que zero.')
            if data.get('quantidade') is not None or data.get('unidade'):
                self.add_error('quantidade', 'Doações em dinheiro usam somente valor em reais.')
        else:
            if not data.get('quantidade') or data['quantidade'] <= 0:
                self.add_error('quantidade', 'Informe uma quantidade maior que zero.')
            if not data.get('unidade'):
                self.add_error('unidade', 'Informe a unidade: kg, unidades, caixas etc.')
            if data.get('valor') is not None:
                self.add_error('valor', 'Doações de bens usam quantidade e unidade.')
        return data
