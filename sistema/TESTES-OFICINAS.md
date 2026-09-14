# Entrega do módulo de oficinas e matrículas

## Escopo

- Cadastro, edição, consulta, busca e paginação de oficinas/turmas.
- Educador, unidade, dias, horários, descrição, situação e limite de vagas.
- Seleção paginada de alunos ativos, matrícula e cancelamento com motivo.
- Ocupação da turma e matrículas na ficha do aluno.
- Histórico de cadastro/edição da turma e de matrículas/cancelamentos.
- Permissões no servidor, CSRF, validação, restrições no banco e proteção de edições por versão.

Cada cadastro corresponde a uma turma. O educador é um campo de identificação, sem vínculo com uma conta de login nesta etapa. Frequência e conflitos de horário entre turmas ficam para incrementos seguintes.

## Dependências verificadas

| Cenário | Resultado esperado e observado |
| --- | --- |
| Matrícula de aluno ativo em turma ativa com vaga | Matrícula criada; ocupação e ficha do aluno atualizadas |
| Aluno na lista de espera ou inativo | Matrícula bloqueada |
| Turma inativa ou lotada | Matrícula bloqueada |
| Mesmo aluno matriculado novamente na mesma turma | Duplicidade bloqueada |
| Cancelamento sem motivo ou na turma errada | Operação bloqueada |
| Cancelamento válido | Vaga liberada; matrícula e motivo preservados |
| Nova matrícula após cancelamento | Permitida; matrícula anterior preservada |
| Inativação de aluno com matrícula ativa | Bloqueada; permitida após cancelar os vínculos |
| Inativação de turma com matrícula ativa | Bloqueada |
| Redução do limite abaixo das matrículas ativas | Bloqueada |
| Duas edições da mesma versão | Segunda edição retorna conflito |
| Duas pessoas disputando a última vaga no PostgreSQL | Uma matrícula criada e outra bloqueada; ocupação final igual a 1 |
| Matrícula duplicada simultânea no PostgreSQL | Uma matrícula criada; nenhuma duplicação |
| Falha na gravação de auditoria | Matrícula e alteração de ocupação revertidas na mesma transação |
| Permissões e requisições sem CSRF | Operações não autorizadas bloqueadas |

## Execução em 12/09/2026

- **PostgreSQL 17 temporário:** 25 testes aprovados, nenhum ignorado. Inclui os 10 testes do cadastro de alunos e 15 do novo módulo, integração e concorrência. Foi utilizado um cluster isolado em `work/`, sem migrar os dados locais do usuário para PostgreSQL.
- **SQLite:** 23 testes aprovados; os 2 testes específicos de bloqueio de linhas são ignorados nesse banco. O código retorna conflito se encontrar contenção de escrita no SQLite.
- **Interface no Edge:** criação de turma, matrícula, lotação, vínculo na ficha do aluno, bloqueios de inativação, cancelamento, liberação e reocupação de vaga, histórico após recarga. Nenhum erro JavaScript.
- **Visual:** desktop e celular (390 px), sem rolagem horizontal da página.
- **Dependências:** `pip check` sem requisitos quebrados; `npm audit` sem vulnerabilidades reportadas.
- **Build:** TypeScript e Vite aprovados.

Os testes de interface utilizam uma conta e alunos fictícios em banco separado. As tabelas de oficinas são adicionadas ao banco local por migração, preservando alunos e usuários existentes.

## Reexecutar

Na pasta `sistema/backend`, com o ambiente configurado:

```powershell
..\.venv\Scripts\python.exe manage.py test
```

Para executar apenas os testes das dependências e do novo módulo:

```powershell
..\.venv\Scripts\python.exe manage.py test oficinas
```

Para incluir concorrência, configure as variáveis PostgreSQL descritas no [README](./README.md). O usuário desse banco de testes precisa de permissão para criar o banco temporário de testes. O pipeline GitHub Actions já usa PostgreSQL, mas a execução remota depende do envio das alterações ao GitHub.

Os bloqueios de escrita seguem as garantias documentadas de [transações Django](https://docs.djangoproject.com/en/5.2/topics/db/transactions/) e [select_for_update](https://docs.djangoproject.com/en/5.2/ref/models/querysets/#select-for-update). A validação local não substitui a homologação da infraestrutura final.
