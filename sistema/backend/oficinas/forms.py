from django import forms
from .models import Oficina


class OficinaForm(forms.ModelForm):
    class Meta:
        model = Oficina
        fields = ['nome', 'turma', 'tipo', 'educador', 'unidade', 'dias_semana',
                  'inicio', 'fim', 'limite_vagas', 'descricao', 'ativa']

    def clean_dias_semana(self):
        dias = self.cleaned_data['dias_semana']
        if not isinstance(dias, list) or not dias or any(type(d) is not int or d not in range(7) for d in dias):
            raise forms.ValidationError('Selecione pelo menos um dia válido.')
        return sorted(set(dias))

    def clean(self):
        data = super().clean()
        for field in ('nome', 'turma', 'tipo', 'educador', 'unidade'):
            if field in data:
                data[field] = ' '.join(data[field].split())
        if data.get('inicio') and data.get('fim') and data['fim'] <= data['inicio']:
            self.add_error('fim', 'O término deve ser depois do início, no mesmo dia.')
        if data.get('limite_vagas') is not None and not 1 <= data['limite_vagas'] <= 1000:
            self.add_error('limite_vagas', 'Informe de 1 a 1000 vagas.')
        return data
