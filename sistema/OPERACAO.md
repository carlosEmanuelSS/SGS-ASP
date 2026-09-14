# Implantação, atualização e recuperação

Este guia prepara a operação. Não representa uma hospedagem já publicada. Para uso pela instituição ainda são necessários servidor, domínio, DNS, credenciais próprias, cópia externa protegida e homologação dos fluxos.

## Atualizar a instalação local existente

Pare o backend antes de atualizar. Na pasta `sistema/backend`, com Python do ambiente:

```powershell
$env:DJANGO_DEBUG = 'true'
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
New-Item -ItemType Directory -Force ../backups
..\.venv\Scripts\python.exe manage.py backup_database --output "../backups/antes-atualizacao.sqlite3"
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py configurar_perfis
$env:CSRF_TRUSTED_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173'
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Use um nome novo para cada backup; o comando recusa sobrescrever. Se o ambiente usa PostgreSQL, mantenha suas variáveis e use extensão `.dump`; instale `pg_dump` e `pg_restore` da mesma versão principal do servidor no PATH. Em outro terminal, na pasta `sistema/frontend`, execute `npm ci` e `npm run dev`. Contas e registros existentes são preservados pelas migrações.

## Produção com Docker Compose

Requisitos: servidor Linux com Docker/Compose, domínio apontando para o servidor e portas 80/443 liberadas. Banco e aplicação não recebem portas públicas. A configuração tem um único proxy de confiança.

Na pasta `sistema`, crie um arquivo `.env` local, protegido e fora do Git:

```dotenv
SGS_DOMAIN=seu-dominio-real
POSTGRES_PASSWORD=senha-aleatoria-exclusiva
POSTGRES_ADMIN_PASSWORD=outra-senha-aleatoria-para-administracao-do-banco
DJANGO_SECRET_KEY=chave-aleatoria-exclusiva-com-mais-de-50-caracteres
```

Os exemplos acima devem ser substituídos. Gere os segredos com um gerador criptográfico, por exemplo `python -c "import secrets; print(secrets.token_urlsafe(64))"`. Nunca reutilize chaves de testes. O Compose lê esse arquivo; o Django executado diretamente não o lê.

```sh
mkdir -p backups
chmod 700 backups
docker compose -f compose.prod.yaml build app
docker compose -f compose.prod.yaml up -d db
docker compose -f compose.prod.yaml run --rm app python manage.py migrate
docker compose -f compose.prod.yaml run --rm app python manage.py configurar_perfis
docker compose -f compose.prod.yaml run --rm app python manage.py createsuperuser
docker compose -f compose.prod.yaml run --rm app python manage.py check --deploy --fail-level WARNING
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml ps
```

Abra o domínio por HTTPS e valide login, gravação, leitura e logout com uma conta de homologação. O Caddy solicita certificado automaticamente quando DNS e conectividade estão corretos. **Não use `compose.ci.yaml` em produção**: ele publica a porta do app apenas para testes.

O processo da aplicação usa usuário sem privilégios no sistema operacional. No PostgreSQL novo, o script de inicialização cria a conta `sgs` sem superusuário e sem permissão para criar bancos ou outras contas; ela possui somente o banco da aplicação. A senha administrativa fica no serviço do banco, não no app. O WhiteNoise entrega frontend compilado e arquivos estáticos do Django; Waitress atende a API. Chave de aplicação fraca/configuração incompleta impedem a inicialização. Os cabeçalhos de proxy só são confiáveis porque a porta do app fica interna e o Caddy sobrescreve os valores recebidos do cliente.

Não use o banco do protótipo/localStorage nem transforme o SQLite local em PostgreSQL apenas mudando variáveis. Uma migração de dados requer exportação, importação, conferência de totais e homologação em cópia separada.

## Backup e restauração

O serviço `backup` usa `pg_dump` consistente em formato customizado, valida a leitura do arquivo e cria uma cópia a cada 24 horas enquanto estiver ativo. Arquivos em andamento terminam em `.partial`; somente os arquivos `.dump` concluídos devem ser usados. A pasta fica no host, fora do volume do banco.

Este backup local **não protege contra perda do servidor inteiro**. Configure cópia externa criptografada, acesso restrito, retenção e alertas antes da operação. Os arquivos contêm dados pessoais; não os coloque no Git nem em pastas públicas. A retenção não é automática: acompanhe o espaço livre e mantenha a política definida pela instituição.

Backup avulso do PostgreSQL em produção:

```sh
docker compose -f compose.prod.yaml exec db pg_dump -U sgs -d sgs -Fc --no-owner --no-acl -f /tmp/sgs-manual.dump
docker compose -f compose.prod.yaml cp db:/tmp/sgs-manual.dump ./backups/sgs-manual.dump
```

Ensaio de restauração em banco novo, com as variáveis do banco e ferramentas PostgreSQL disponíveis no terminal:

```sh
python manage.py restaurar_backup --input /caminho/backup.dump --destino sgs_restore_ensaio
```

O comando recusa substituir o banco atual ou um destino já existente. O destino PostgreSQL deve começar com `sgs_restore_` e a conta usada no ensaio precisa criar bancos; a conta normal do app não tem essa permissão. Para executar apenas com os contêineres, copie o arquivo para `db:/tmp/restore.dump`, crie um banco novo com `createdb -U postgres -O sgs sgs_restore_ensaio` e use `pg_restore -U postgres --role=sgs --no-owner --no-acl --exit-on-error --single-transaction -d sgs_restore_ensaio /tmp/restore.dump`.

Confira registros, totais, usuários, históricos e restrições na cópia restaurada. Em um incidente, preserve o banco afetado e faça a troca de destino somente após verificar a restauração. Nunca execute `docker compose down -v` contra uma instalação com dados a preservar.

Para SQLite, `backup_database` usa a API de backup do banco em vez de copiar um arquivo em uso. `restaurar_backup --input copia.sqlite3 --destino novo.sqlite3` valida integridade e referências em um arquivo novo.

## Monitoramento e manutenção

- `/healthz/` retorna 200 quando a conexão ao banco funciona e 503 na falha, sem revelar credenciais.
- Verifique `docker compose -f compose.prod.yaml ps`, logs do app/proxy/backup e a data do último arquivo concluído. Configure um monitor externo para indisponibilidade e backup atrasado.
- Execute periodicamente `python manage.py clearsessions` para remover sessões expiradas.
- Revise contas, grupos e vínculos de educadores. Desative contas que perderam autorização.
- Execute os testes e as auditorias antes de atualizações. Refaça o ensaio de restauração regularmente.
- Ações de negócio usam históricos próprios. Autenticação e bloqueios são registrados pelo Axes; a administração de usuários possui o log do Django admin.

## Verificação automatizada

```sh
# backend, com ambiente configurado
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test --noinput
pip-audit -r requirements.txt
# frontend
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

No Windows com Edge instalado, use `$env:SGS_EDGE='1'` antes dos testes de navegador. O servidor E2E usa banco temporário, contas fictícias e portas 8002/5175; não reutiliza o banco do usuário. Para PostgreSQL, a conta de testes precisa criar bancos, inclusive os destinos isolados de restauração.

A rotina GitHub Actions verifica os dois bancos, navegador, dependências e um build/smoke test em contêiner. A execução remota depende de publicar a branch com uma conta autorizada no GitHub.

Referências: [checklist de implantação do Django](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/), [proteção contra fórmulas em CSV](https://community.owasp.org/attacks/CSV_Injection).
