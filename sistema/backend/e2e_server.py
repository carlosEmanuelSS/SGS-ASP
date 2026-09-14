"""Servidor exclusivo dos testes de navegador, com banco temporário e dados fictícios."""
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory

if os.environ.get('SGS_E2E') != '1':
    raise SystemExit('Este servidor é exclusivo do teste E2E (SGS_E2E=1).')

with TemporaryDirectory(prefix='sgs-e2e-') as directory:
    # Ignora qualquer configuração do banco real herdada do terminal.
    os.environ.pop('POSTGRES_HOST', None)
    os.environ.update(DJANGO_SETTINGS_MODULE='config.settings', DJANGO_DEBUG='true',
        SQLITE_PATH=str(Path(directory) / 'test.sqlite3'),
        DJANGO_ALLOWED_HOSTS='localhost,127.0.0.1',
        CSRF_TRUSTED_ORIGINS='http://127.0.0.1:5175', TRUST_PROXY_HEADERS='false')
    import django
    django.setup()
    from django.core.management import call_command
    from django.contrib.auth.models import Group, User
    from alunos.models import Aluno
    from oficinas.models import Oficina, Matricula
    from frequencia.models import ResponsavelTurma
    call_command('migrate', verbosity=0)
    call_command('configurar_perfis', verbosity=0)
    for name, group in [('tecnico_e2e', 'Equipe técnica'), ('outro_e2e', 'Equipe técnica'), ('educador_e2e', 'Educador')]:
        user = User.objects.create_user(name, password='Somente-Testes-E2E-846!')
        user.groups.add(Group.objects.get(name=group))
    User.objects.create_superuser('admin_e2e', password='Somente-Testes-E2E-846!')
    aluno = Aluno.objects.create(nome='Aluno E2E', data_nascimento='2010-01-01', responsavel='Responsável fictício',
        parentesco='Mãe', telefone='61999999999', status='ativo')
    oficina = Oficina.objects.create(nome='Oficina E2E', turma='A', tipo='Cultura', educador='Educador E2E',
        unidade='Unidade de teste', dias_semana=[0,1,2,3,4], inicio='08:00', fim='09:00', limite_vagas=10)
    Matricula.objects.create(aluno=aluno, oficina=oficina)
    ResponsavelTurma.objects.create(oficina=oficina, usuario=User.objects.get(username='educador_e2e'))
    call_command('runserver', '127.0.0.1:8002', use_reloader=False)
