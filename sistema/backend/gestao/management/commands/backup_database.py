import os
from contextlib import closing
from pathlib import Path
import sqlite3
import subprocess
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Cria uma cópia consistente do banco, sem sobrescrever arquivos existentes.'

    def add_arguments(self, parser):
        parser.add_argument('--output', required=True)

    def handle(self, *args, **options):
        db = settings.DATABASES['default']
        output = Path(options['output']).resolve()
        if not output.parent.is_dir():
            raise CommandError('A pasta de destino deve existir e ter acesso restrito.')
        try:
            fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError as e:
            raise CommandError('O arquivo já existe. Escolha um novo nome.') from e
        os.close(fd)
        try:
            if db['ENGINE'].endswith('sqlite3'):
                with closing(sqlite3.connect(str(db['NAME']))) as source, closing(sqlite3.connect(output)) as dest:
                    source.backup(dest)
                    if dest.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                        raise CommandError('Falha na verificação de integridade do backup.')
            else:
                env = {**os.environ, 'PGPASSWORD': db['PASSWORD']}
                subprocess.run(['pg_dump', '--host', db['HOST'], '--port', str(db['PORT']),
                    '--username', db['USER'], '--dbname', db['NAME'], '--format=custom',
                    '--no-owner', '--no-acl', '--file', str(output)], env=env, check=True,
                    **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}))
        except (OSError, subprocess.CalledProcessError, sqlite3.Error) as e:
            # Arquivo parcial é mantido para diagnóstico; nunca anunciar backup bem-sucedido.
            raise CommandError('Backup falhou. Não use o arquivo parcial gerado.') from e
        self.stdout.write(self.style.SUCCESS(f'Backup concluído: {output}'))
