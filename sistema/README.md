# SGS ASP — implementação do sistema

Módulos funcionais: Alunos, Oficinas e matrículas, Frequência, Atendimentos, Doações, Visão geral e Relatórios. Todos usam API e banco de dados. O protótipo em `../prototipo/` permanece preservado. Consulte [ENTREGA.md](./ENTREGA.md) para evidências e limites, [MANUAL.md](./MANUAL.md) para uso e [OPERACAO.md](./OPERACAO.md) para implantação, atualização e recuperação. A homologação com a ASP e a infraestrutura pública ainda precisam ser concluídas.

## Estrutura

```text
sistema/
├── backend/
│   ├── config/                 # Configuração, URLs e WSGI
│   ├── alunos/                 # Modelo, validação, API, histórico e testes
│   │   ├── migrations/         # Evolução versionada do banco
│   │   └── management/         # Comando para criar perfis de acesso
│   ├── oficinas/               # Turmas, matrículas, vagas e testes de integração
│   ├── frequencia/             # Chamadas, presenças, correções e acessos por turma
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/features/           # Módulos React: alunos e oficinas
│   └── package-lock.json
└── compose.yaml                # PostgreSQL local opcional
```

React mantém a tecnologia de interface do protótipo. Django concentra autenticação, permissões, validação e migrações. PostgreSQL foi escolhido como banco para produção; SQLite permite desenvolver sem instalar outro serviço. Essa escolha inicia a implementação e não representa uma decisão anterior do cliente. A API evita depender do armazenamento do navegador.

## Executar no Windows

Requisitos: Python 3.12+ e Node.js 22.12+ (recomendado Node 24). Os comandos abaixo partem de `sistema/`, em PowerShell.

Terminal 1, backend:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
$env:DJANGO_DEBUG = 'true'
$env:CSRF_TRUSTED_ORIGINS = 'http://127.0.0.1:5173,http://localhost:5173'
cd backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py configurar_perfis
..\.venv\Scripts\python.exe manage.py createsuperuser
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Terminal 2, frontend, também partindo de `sistema/`:

```powershell
cd frontend
npm ci
npm run dev
```

Abra http://127.0.0.1:5173. Use o usuário que você criou; não há senha padrão nem alunos de demonstração. O frontend encaminha `/api/` ao backend. Em http://127.0.0.1:8000/admin/ o administrador cadastra usuários e atribui os grupos criados pelo comando `configurar_perfis`.

O arquivo `backend/.env.example` documenta as variáveis, mas **não é carregado automaticamente**. No PowerShell use `$env:NOME = 'valor'`; na hospedagem configure as variáveis do serviço.

## Perfis e regras implementadas

| Perfil | Consulta | Cadastro e edição |
| --- | --- | --- |
| Administrador (superusuário) | Sim | Sim |
| Secretaria | Sim | Sim |
| Equipe técnica | Sim | Sim |
| Coordenação | Sim | Não |
| Educador | Não neste módulo | Não |

Educadores acessam as turmas vinculadas pelo módulo de Frequência. O acesso à ficha familiar completa permanece bloqueado para esse perfil. O painel administrativo gerencia usuários e grupos; os registros de negócio são alterados exclusivamente pela API para manter validação e auditoria.

- Nome, nascimento, responsável, parentesco e telefone com DDD são obrigatórios.
- CPF é opcional: quando informado, deve ser válido e único, inclusive entre alunos inativos. A validação de dígitos não consulta a Receita Federal.
- Sem CPF, nomes iguais não são bloqueados porque podem existir homônimos; a equipe deve conferir os dados antes de cadastrar.
- Matrícula escolar, renda familiar e observações são opcionais. Há indicação de participação em programas sociais.
- Novos alunos entram na lista de espera. Ativação, retorno à espera e inativação são feitos na edição, com motivo obrigatório.
- Não existe exclusão física pela API. O histórico registra autor, horário, campos alterados, motivo e transição de situação. Ele não armazena versões anteriores completas dos dados pessoais.
- Cada edição exige a versão lida pela tela. Uma edição concorrente retorna HTTP 409 e exige reabrir a ficha.
- A lista tem busca por nome, responsável ou CPF, filtro por situação e paginação de 20 registros.
- Login usa sessão em cookie HttpOnly e proteção CSRF. Cinco falhas bloqueiam temporariamente o usuário ou IP por 15 minutos. Administradores podem usar `manage.py axes_reset` quando necessário.

## Oficinas, turmas e matrículas

Após entrar, use a aba **Oficinas e matrículas**. Cada registro representa uma turma: oficina, nome da turma, área da atividade, educador responsável, unidade, dias da semana, horários e limite de vagas. Uma oficina pode ter várias turmas; a combinação oficina/turma/unidade não pode se repetir exatamente.

1. Crie uma oficina e turma, indicando pelo menos um dia e de 1 a 1000 vagas.
2. Abra **Ver turma e matrículas**.
3. Busque um aluno ativo e clique em **Matricular**.
4. Confira a ocupação e o vínculo que aparece também na ficha do aluno.
5. Para cancelar, selecione a matrícula e informe o motivo. A vaga é liberada e o registro permanece no histórico.

A matrícula exige aluno ativo, turma ativa, vaga disponível e ausência de matrícula ativa para o mesmo aluno/turma. Após cancelar, uma nova matrícula pode ser criada, preservando o registro anterior. Não é possível reduzir o limite abaixo da ocupação ou inativar uma turma com matrículas ativas. Da mesma forma, um aluno com matrículas ativas não pode ser inativado nem retornar à lista de espera antes dos cancelamentos.

Secretaria e coordenação podem criar/editar turmas e gerenciar matrículas. A equipe técnica consulta turmas e gerencia matrículas. Educadores acessam suas turmas pelo módulo de frequência. O nome do responsável pela atividade continua sendo cadastral; a permissão de acesso depende da vinculação explícita de uma conta na frequência. Não há validação automática de conflitos de horários entre atividades nesta etapa.

Em instalações existentes, execute `manage.py migrate` e `manage.py configurar_perfis`, reinicie o backend e atualize a página. As novas tabelas preservam os alunos e usuários cadastrados.

## Frequência

1. Entre na aba **Frequência** e abra a turma.
2. Selecione a data da aula, até hoje. Datas fora dos dias habituais são sinalizadas, mas permitem registrar uma aula extra.
3. Marque todos os alunos como **Presente** ou **Falta**. O botão **Marcar todos presentes** é uma ação explícita; nenhuma presença é presumida ao abrir a chamada.
4. Registre justificativas opcionais para faltas e salve a chamada.
5. Para corrigir uma chamada salva, altere as marcações, informe o motivo e clique em **Salvar correção**. O histórico mostra autor, horário, valores anteriores e novos.

Só existe uma chamada por turma/data. A lista usa as matrículas válidas na data local de São Paulo: o dia da matrícula e o dia do cancelamento são incluídos. Em caso de rematrícula no mesmo dia, é usado o vínculo mais recente, sem duplicar o aluno. Por isso, um aluno cancelado hoje ainda pode aparecer na chamada de hoje; amanhã não aparecerá em novas chamadas.

A lista de alunos fica preservada ao salvar a chamada. Cancelamentos, alterações de nome e novas matrículas não reescrevem chamadas antigas. Correções mantêm os participantes originais. Uma turma inativa não recebe novas chamadas, mas permite consultar e corrigir as existentes. Não há exclusão física pela API. A ficha do aluno apresenta o total de aulas, presenças, faltas e os últimos 50 registros; faltas justificadas continuam contando como faltas.

**Acesso dos educadores:** crie a conta no `/admin/` e atribua o grupo **Educador**. Na frequência, a secretaria ou coordenação abre a turma, expande **Educadores com acesso a esta turma**, seleciona a conta e salva. O educador poderá consultar, registrar e corrigir apenas chamadas das turmas vinculadas, sem acesso às fichas familiares ou à gestão de matrículas. A retirada do vínculo revoga o acesso àquela turma. Contas inativas não conseguem entrar.

Secretaria e coordenação consultam/registram/corrigem todas as turmas e gerenciam os vínculos. A equipe técnica consulta todas as chamadas, sem poder alterá-las. O administrador tem acesso completo. Para atualizar uma instalação existente, execute `manage.py migrate` e `manage.py configurar_perfis` antes de reiniciar o servidor.

Consulte [TESTES-FREQUENCIA.md](./TESTES-FREQUENCIA.md) para a validação técnica do módulo.

## Usar PostgreSQL

Com Docker instalado, na pasta `sistema/`:

```powershell
$env:POSTGRES_PASSWORD = 'defina-uma-senha-local-forte'
docker compose up -d db
$env:POSTGRES_HOST = '127.0.0.1'
$env:POSTGRES_DB = 'sgs'
$env:POSTGRES_USER = 'sgs'
$env:DJANGO_DEBUG = 'true'
cd backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py configurar_perfis
..\.venv\Scripts\python.exe manage.py createsuperuser
..\.venv\Scripts\python.exe manage.py test
```

Use essas mesmas variáveis ao iniciar o backend. Mudar o banco não transfere automaticamente dados do SQLite. Qualquer importação deve ser planejada, validada e executada separadamente. O PostgreSQL fica em volume persistente; não use `docker compose down -v` se houver dados a preservar.

## Verificações

Com `DJANGO_DEBUG=true`, na pasta `backend/`:

```powershell
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
..\.venv\Scripts\python.exe manage.py test
```

Na pasta `frontend/`: `npm run build` verifica TypeScript e gera `dist/`. O lockfile fixa as dependências instaladas. O pipeline em `.github/workflows/sistema.yml` também executa os testes com PostgreSQL.

## Antes da operação no cliente

A infraestrutura de produção ainda não foi contratada nem publicada. O [guia de operação](./OPERACAO.md) entrega Docker Compose com PostgreSQL, Waitress, frontend compilado servido pelo WhiteNoise, proxy Caddy com HTTPS e backup diário. Não use `runserver` ou o servidor Vite em produção.

Defina `DJANGO_DEBUG=false`, `DJANGO_SECRET_KEY` aleatória, `DJANGO_ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` e PostgreSQL. O backend recusa iniciar em produção sem chave e banco configurados. Se houver proxy terminando HTTPS, configure a confiança no cabeçalho de protocolo exclusivamente para esse proxy, que deve remover cabeçalhos enviados pelo cliente. Ajuste também a identificação do IP no Axes para evitar que todos os usuários compartilhem o IP do proxy. Execute `manage.py check --deploy` na configuração final.

Ainda é necessário validar os fluxos com a ASP, homologar a infraestrutura escolhida e configurar cópias externas protegidas. Atendimentos e doações foram implementados com histórico e controle de acesso; backup/restauração foram testados em SQLite e PostgreSQL. Upload de documentos e recuperação por e-mail não têm fluxo definido neste escopo; o administrador pode redefinir senhas no painel. Nenhuma conta de demonstração é criada no banco de uso normal.

Referências técnicas: [autenticação Django](https://docs.djangoproject.com/en/5.2/topics/auth/default/), [proteção CSRF](https://docs.djangoproject.com/en/5.2/howto/csrf/), [implantação Django](https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/) e [Django Axes](https://django-axes.readthedocs.io/en/latest/2_installation.html).
