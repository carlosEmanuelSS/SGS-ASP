import re
from django import forms
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin
from .models import PerfilEducador

User = get_user_model()


class PerfilEducadorForm(forms.ModelForm):
    class Meta:
        model = PerfilEducador
        fields = ['telefone', 'observacoes']

    def clean_telefone(self):
        # Mesma regra do cadastro de alunos: DDD + 10 ou 11 dígitos; guarda só os números.
        raw = self.cleaned_data['telefone']
        digitos = re.sub(r'\D', '', raw)
        if raw and (re.search(r'[^0-9()\-\s]', raw) or len(digitos) not in (10, 11)):
            raise forms.ValidationError('Informe DDD e telefone, com 10 ou 11 dígitos.')
        return digitos


class PerfilEducadorInline(admin.StackedInline):
    model = PerfilEducador
    form = PerfilEducadorForm
    can_delete = False
    verbose_name = 'Contato do educador (preencha só se o usuário for educador)'


admin.site.unregister(User)


@admin.register(User)
class UsuarioAdmin(UserAdmin):
    inlines = [PerfilEducadorInline]
    list_filter = UserAdmin.list_filter + ('groups',)

    def get_inlines(self, request, obj):
        # Ao criar, só login e senha; o contato entra na edição, junto de nome e e-mail.
        return self.inlines if obj else []
