import os
from contextlib import closing
from pathlib import Path
import re
import sqlite3
import subprocess
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Restaura um backup em um destino NOVO para ensaio de recuperação. Nunca substitui o banco atual.'

    def add_arguments(self, parser):
        parser.add_argument('--input', required=True)
        parser.add_argument('--destino', required=True)

    def handle(self, *args, **options):
        source = Path(options['input']).resolve()
        if not source.is_file():
            raise CommandError('Backup não encontrado.')
        db = settings.DATABASES['default']
        if db['ENGINE'].endswith('sqlite3'):
            dest = Path(options['destino']).resolve()
            if dest == source or dest == Path(db['NAME']).resolve():
                raise CommandError('O destino não pode ser o banco atual nem o backup.')
            try:
                fd = os.open(dest, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                os.close(fd)
                with closing(sqlite3.connect(source.as_uri() + '?mode=ro', uri=True)) as src, closing(sqlite3.connect(dest)) as target:
                    src.backup(target)
                    if target.execute('PRAGMA integrity_check').fetchone()[0] != 'ok' or target.execute('PRAGMA foreign_key_check').fetchone():
                        raise CommandError('Falha de integridade no banco restaurado.')
            except (OSError, sqlite3.Error) as e:
                raise CommandError('Falha ao restaurar. O destino deve ser novo e válido.') from e
        else:
            import psycopg
            from psycopg import sql
            dest = options['destino']
            if not re.fullmatch(r'sgs_restore_[a-z0-9_]{1,40}', dest) or dest == db['NAME']:
                raise CommandError('Use um banco novo com nome sgs_restore_<identificador>.')
            try:
                with psycopg.connect(host=db['HOST'], port=db['PORT'], user=db['USER'],
                                    password=db['PASSWORD'], dbname='postgres', autocommit=True) as conn:
                    conn.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(dest)))
                subprocess.run(['pg_restore', '--exit-on-error', '--single-transaction', '--no-owner',
                    '--no-acl', '--host', db['HOST'], '--port', str(db['PORT']), '--username',
                    db['USER'], '--dbname', dest, str(source)], check=True,
                    env={**os.environ, 'PGPASSWORD': db['PASSWORD']},
                    **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}))
            except (OSError, psycopg.Error, subprocess.CalledProcessError) as e:
                raise CommandError('Restauração falhou. Confira o destino isolado; o banco atual não foi alterado.') from e
        self.stdout.write(self.style.SUCCESS(f'Restauração concluída em destino isolado: {dest}'))
