from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from io import StringIO
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
from threading import Barrier
from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.management import call_command, CommandError
from django.db import connections, DatabaseError
from django.test import Client, RequestFactory, SimpleTestCase, TransactionTestCase, override_settings, skipUnlessDBFeature
from django.utils import timezone
from alunos.models import Aluno
from config.proxy import client_ip
from .models import Atendimento

User = get_user_model()


class OperacaoTests(SimpleTestCase):
    def test_backup_e_restauracao_sqlite_sem_sobrescrever(self):
        with TemporaryDirectory() as directory:
            source = Path(directory) / 'original.sqlite3'
            backup = Path(directory) / 'backup.sqlite3'
            restored = Path(directory) / 'restore.sqlite3'
            with closing(sqlite3.connect(source)) as conn:
                conn.execute('CREATE TABLE teste (id INTEGER PRIMARY KEY, nome TEXT)')
                conn.execute("INSERT INTO teste VALUES (1, 'registro original')")
                conn.commit()
            config = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': str(source)}}
            with patch('gestao.management.commands.backup_database.settings.DATABASES', config):
                call_command('backup_database', output=str(backup), stdout=StringIO())
                with self.assertRaises(CommandError):
                    call_command('backup_database', output=str(backup))
            with patch('gestao.management.commands.restaurar_backup.settings.DATABASES', config):
                call_command('restaurar_backup', input=str(backup), destino=str(restored), stdout=StringIO())
                for target in [source, backup, restored]:
                    with self.assertRaises(CommandError):
                        call_command('restaurar_backup', input=str(backup), destino=str(target))
            with closing(sqlite3.connect(restored)) as conn:
                self.assertEqual(conn.execute('SELECT nome FROM teste').fetchone()[0], 'registro original')
                self.assertEqual(conn.execute('PRAGMA integrity_check').fetchone()[0], 'ok')

    def test_proxy_ignora_cabecalho_forjado_sem_confianca(self):
        request = RequestFactory().get('/', REMOTE_ADDR='127.0.0.1', HTTP_X_FORWARDED_FOR='8.8.8.8')
        with override_settings(SECURE_PROXY_SSL_HEADER=None):
            self.assertEqual(client_ip(request), '127.0.0.1')
        with override_settings(SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO', 'https')):
            self.assertEqual(client_ip(request), '8.8.8.8')
            request.META['HTTP_X_FORWARDED_FOR'] = '8.8.8.8, 1.1.1.1'
            self.assertIsNone(client_ip(request))

    @override_settings(DEBUG=False, SECURE_SSL_REDIRECT=True, SECURE_PROXY_SSL_HEADER=('HTTP_X_FORWARDED_PROTO', 'https'))
    def test_cabecalhos_https_e_csrf_cookie(self):
        # Rota de erro não acessa dados nem depende de login.
        response = self.client.get('/nao-existe/', secure=True)
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response['X-Frame-Options'], 'DENY')
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
        self.assertIn("frame-ancestors 'none'", response['Content-Security-Policy'])
        self.assertEqual(self.client.get('/api/session/').status_code, 301)

    def test_health_falha_sem_expor_credenciais(self):
        with patch('config.health.connection') as conn:
            conn.cursor.side_effect = DatabaseError('segredo do banco')
            response = self.client.get('/healthz/')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {'status': 'unavailable'})


@skipUnlessDBFeature('has_select_for_update')
class ConcorrenciaAtendimentoTests(TransactionTestCase):
    def test_apenas_uma_correcao_por_versao(self):
        user = User.objects.create_superuser('autor')
        aluno = Aluno.objects.create(nome='Aluno concorrência', data_nascimento='2010-01-01',
            responsavel='Responsável', parentesco='Mãe', telefone='61999999999')
        obj = Atendimento.objects.create(autor=user, aluno=aluno, data=timezone.localdate(),
            tipo='social', nivel='confidencial', descricao='Original')
        barrier = Barrier(2)
        def worker(i):
            connections.close_all()
            try:
                client = Client()
                client.force_login(User.objects.get(pk=user.pk), backend='django.contrib.auth.backends.ModelBackend')
                barrier.wait(timeout=20)
                return client.put(f'/api/atendimentos/{obj.pk}/', {
                    'aluno': str(aluno.pk), 'data': str(timezone.localdate()), 'tipo': 'social',
                    'nivel': 'confidencial', 'descricao': f'Correção {i}', 'encaminhamento': '',
                    'versao': 1, 'motivo': 'Conferência'}, content_type='application/json').status_code
            finally:
                connections.close_all()
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(worker, [1, 2])), [200, 409])
        obj.refresh_from_db()
        self.assertEqual(obj.versao, 2)
        self.assertEqual(obj.revisoes.count(), 1)
