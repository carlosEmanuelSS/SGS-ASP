from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Cria os perfis do sistema, sem criar usuários ou senhas.'

    def handle(self, *args, **options):
        for name, codes in {
            'Secretaria': ['view_aluno', 'add_aluno', 'change_aluno'],
            'Equipe técnica': ['view_aluno', 'add_aluno', 'change_aluno'],
            'Coordenação': ['view_aluno'],
            'Educador': [],
        }.items():
            group, _ = Group.objects.get_or_create(name=name)
            group.permissions.add(*Permission.objects.filter(content_type__app_label='alunos', codename__in=codes))
        self.stdout.write(self.style.SUCCESS('Perfis criados. Atribua os grupos aos usuários no /admin/.'))
        for name, codes in {
            'Secretaria': ['view_oficina', 'add_oficina', 'change_oficina', 'add_matricula', 'change_matricula'],
            'Equipe técnica': ['view_oficina', 'add_matricula', 'change_matricula'],
            'Coordenação': ['view_oficina', 'add_oficina', 'change_oficina', 'add_matricula', 'change_matricula'],
        }.items():
            group = Group.objects.get(name=name)
            group.permissions.add(*Permission.objects.filter(content_type__app_label='oficinas', codename__in=codes))
        for name, codes in {
            'Secretaria': ['view_chamada', 'add_chamada', 'change_chamada', 'ver_todas_chamadas', 'gerir_responsaveis'],
            'Coordenação': ['view_chamada', 'add_chamada', 'change_chamada', 'ver_todas_chamadas', 'gerir_responsaveis'],
            'Equipe técnica': ['view_chamada', 'ver_todas_chamadas'],
            'Educador': ['view_chamada', 'add_chamada', 'change_chamada'],
        }.items():
            group = Group.objects.get(name=name)
            group.permissions.add(*Permission.objects.filter(content_type__app_label='frequencia', codename__in=codes))
        for name, codes in {
            'Secretaria': ['view_atendimento', 'add_atendimento', 'change_atendimento', 'view_doacao', 'add_doacao', 'change_doacao', 'ver_indicadores'],
            'Equipe técnica': ['view_atendimento', 'add_atendimento', 'change_atendimento', 'ler_restritos', 'view_doacao', 'add_doacao', 'change_doacao', 'ver_indicadores'],
            'Coordenação': ['view_atendimento', 'view_doacao', 'ver_indicadores'],
        }.items():
            group = Group.objects.get(name=name)
            group.permissions.add(*Permission.objects.filter(content_type__app_label='gestao', codename__in=codes))
