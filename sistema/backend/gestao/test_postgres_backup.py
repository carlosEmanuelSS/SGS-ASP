from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
from unittest import skipUnless
from uuid import uuid4
from io import StringIO
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import connection
from django.test import TransactionTestCase
from django.utils import timezone
from alunos.models import Aluno
from .models import Atendimento, RevisaoAtendimento


@skipUnless(connection.vendor == 'postgresql' and shutil.which('pg_dump') and shutil.which('pg_restore'),
            'Exige PostgreSQL e ferramentas pg_dump/pg_restore compatíveis.')
class PostgreSQLBackupTests(TransactionTestCase):
    def test_dump_restaurado_preserva_dados_e_historico(self):
        import psycopg
        from psycopg import sql
        user = get_user_model().objects.create_user('backup_test')
        aluno = Aluno.objects.create(nome='Aluno backup', data_nascimento='2010-01-01',
            responsavel='Responsável', parentesco='Mãe', telefone='61999999999')
        atendimento = Atendimento.objects.create(aluno=aluno, autor=user, data=timezone.localdate(),
            tipo='social', nivel='confidencial', descricao='Relato preservado')
        RevisaoAtendimento.objects.create(atendimento=atendimento, autor=user, versao=1, dados={'descricao':'Relato preservado'})
        db = settings.DATABASES['default']
        target = 'sgs_restore_' + uuid4().hex
        kwargs = dict(host=db['HOST'], port=db['PORT'], user=db['USER'], password=db['PASSWORD'])
        restored = False
        try:
            with TemporaryDirectory() as directory:
                backup = str(Path(directory) / 'teste.dump')
                call_command('backup_database', output=backup, stdout=StringIO())
                call_command('restaurar_backup', input=backup, destino=target, stdout=StringIO())
                restored = True
                with psycopg.connect(**kwargs, dbname=target) as conn:
                    self.assertEqual(conn.execute('SELECT nome FROM alunos_aluno').fetchone()[0], 'Aluno backup')
                    self.assertEqual(conn.execute('SELECT descricao FROM gestao_atendimento').fetchone()[0], 'Relato preservado')
                    self.assertEqual(conn.execute('SELECT dados FROM gestao_revisaoatendimento').fetchone()[0]['descricao'], 'Relato preservado')
                    with connection.cursor() as source:
                        source.execute('SELECT count(*) FROM django_migrations')
                        self.assertEqual(conn.execute('SELECT count(*) FROM django_migrations').fetchone()[0], source.fetchone()[0])
                    # A chave estrangeira restaurada precisa continuar impedindo perda de histórico.
                    conn.execute('SET CONSTRAINTS ALL IMMEDIATE')
                    with self.assertRaises(psycopg.errors.ForeignKeyViolation):
                        conn.execute('DELETE FROM alunos_aluno')
        finally:
            if restored:
                with psycopg.connect(**kwargs, dbname='postgres', autocommit=True) as conn:
                    conn.execute(sql.SQL('DROP DATABASE {}').format(sql.Identifier(target)))
