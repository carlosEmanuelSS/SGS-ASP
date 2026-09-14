import re
from datetime import date
from django import forms
from .models import Aluno


def cpf_valido(cpf):
    if len(cpf) != 11 or len(set(cpf)) == 1:
        return False
    for size in (9, 10):
        total = sum(int(cpf[i]) * (size + 1 - i) for i in range(size))
        digito = (total * 10 % 11) % 10
        if digito != int(cpf[size]):
            return False
    return True


class AlunoForm(forms.ModelForm):
    cpf = forms.CharField(max_length=14, required=False)
    telefone = forms.CharField(max_length=20)
    class Meta:
        model = Aluno
        fields = ['nome', 'data_nascimento', 'cpf', 'matricula_escolar', 'responsavel',
                  'parentesco', 'telefone', 'renda_familiar', 'programas_sociais', 'observacoes']

    def clean_nome(self):
        nome = ' '.join(self.cleaned_data['nome'].split())
        if len(nome) < 3:
            raise forms.ValidationError('Informe o nome do aluno com pelo menos 3 caracteres.')
        return nome

    def clean_data_nascimento(self):
        value = self.cleaned_data['data_nascimento']
        if value > date.today():
            raise forms.ValidationError('A data de nascimento não pode estar no futuro.')
        return value

    def clean_cpf(self):
        raw = self.cleaned_data.get('cpf') or ''
        if re.search(r'[^0-9.\-\s]', raw):
            raise forms.ValidationError('CPF inválido.')
        value = re.sub(r'\D', '', raw)
        if value and not cpf_valido(value):
            raise forms.ValidationError('CPF inválido.')
        return value or None

    def clean_telefone(self):
        raw = self.cleaned_data['telefone']
        if re.search(r'[^0-9()\-\s]', raw):
            raise forms.ValidationError('Informe DDD e telefone, com 10 ou 11 dígitos.')
        value = re.sub(r'\D', '', raw)
        if len(value) not in (10, 11):
            raise forms.ValidationError('Informe DDD e telefone, com 10 ou 11 dígitos.')
        return value

    def clean_renda_familiar(self):
        value = self.cleaned_data['renda_familiar']
        if value is not None and value < 0:
            raise forms.ValidationError('A renda não pode ser negativa.')
        return value
