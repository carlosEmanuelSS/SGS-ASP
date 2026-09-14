# Entrega do módulo de frequência

Validação em 13/09/2026. Implementação local na pasta `sistema/`.

## O que foi implementado

- Chamada por turma e data, com presença, falta e justificativa opcional.
- Lista completa de matrículas válidas na data; nenhuma marcação automática de presença.
- Lista de participantes preservada após o primeiro salvamento.
- Correção com motivo obrigatório, controle de versão, autor e valores anteriores/novos.
- Histórico das chamadas de cada turma e resumo na ficha do aluno.
- Vinculação explícita de contas do grupo Educador às turmas, com histórico administrativo dos vínculos.
- Controle de acesso por operação e por turma no servidor.

## Regras verificadas

| Caso | Comportamento |
| --- | --- |
| Aluno sem marcação, marcação inválida ou aluno repetido | Salvamento bloqueado |
| Lista incompleta, matrícula de outra turma ou lista desatualizada | Salvamento bloqueado sem gravação parcial |
| Data futura, inválida ou fora do formato | Requisição rejeitada |
| Matrícula ainda não iniciada ou encerrada antes da data | Aluno não aparece no rascunho |
| Matrícula cancelada no próprio dia | Aluno continua elegível nessa data |
| Rematrícula no mesmo dia | Um registro por aluno, usando o vínculo mais recente |
| Horário UTC próximo à meia-noite | Data calculada no fuso de São Paulo |
| Turma inativa | Bloqueia novas chamadas e preserva consulta/correção das existentes |
| Chamada já registrada na data | Nova criação bloqueada; correção deve usar PUT e versão atual |
| Correção sem motivo, sem alteração ou com versão antiga | Operação bloqueada |
| Alteração válida | Valores anteriores e novos registrados com o autor |
| Cancelamento, inativação ou mudança de nome posterior | Chamada salva mantém a lista e os nomes registrados |
| Nova matrícula após salvar | Não adiciona aluno retroativamente à chamada existente |
| Falha na auditoria | Transação desfaz a chamada ou correção e suas marcações |
| Educador sem vínculo ou com vínculo retirado | Consulta e escrita na turma bloqueadas |
| Equipe técnica | Consulta permitida; escrita bloqueada |
| Requisição sem login ou sem CSRF | Acesso/operação bloqueado |
| Duas criações simultâneas no PostgreSQL | Uma chamada criada; outra requisição retorna conflito |
| Duas correções da mesma versão no PostgreSQL | Uma correção salva; outra retorna conflito |

## Evidências de execução

- **PostgreSQL 17:** 42 testes aprovados, nenhum ignorado. A suíte inclui alunos, oficinas, matrículas, frequência, acessos e concorrência.
- **SQLite:** 38 testes aprovados; 4 testes de bloqueios de linhas exclusivos de PostgreSQL foram ignorados.
- **Edge:** vinculação de educador, registro de presença/falta/justificativa, acesso limitado às turmas atribuídas, correção, recarga, ficha do aluno e preservação após cancelamento validados sem erros JavaScript.
- **Interface:** capturas revisadas em desktop e celular de 390 px, sem rolagem horizontal da página.
- **Build:** TypeScript e Vite aprovados.

Os bancos e usuários utilizados nos testes são isolados dos registros locais do usuário. A validação no PostgreSQL não transfere o banco local SQLite para produção.

## Como testar no sistema

1. Entre em **Frequência**, abra uma turma com matrículas e selecione a data.
2. Marque presença ou falta para todos os alunos, acrescente uma justificativa de falta se necessário e salve.
3. Altere uma marcação, informe o motivo da correção e salve novamente. Confira o histórico.
4. Consulte o resumo em **Alunos → Ver ficha → Frequência do aluno**.
5. Para testar como educador, crie uma conta do grupo **Educador** no painel administrativo e vincule-a em **Frequência → turma → Educadores com acesso a esta turma**.

Na pasta `sistema/backend`, com o ambiente ativado/configurado:

```powershell
..\.venv\Scripts\python.exe manage.py test
```

Para executar apenas este módulo: `manage.py test frequencia`. Use a configuração PostgreSQL do README para incluir os testes de concorrência; o usuário do banco de testes precisa conseguir criar o banco temporário de testes.

## Limites desta etapa

Há uma chamada por turma/dia. Não são diferenciadas várias aulas da mesma turma no mesmo dia. Dias fora da agenda habitual são permitidos como aulas extras, com aviso na tela. Matrícula e cancelamento são inclusivos no dia local, porque ainda não existe uma data/hora efetiva de participação separada do registro do vínculo. A lista salva não pode receber ou excluir participantes: correções alteram apenas as marcações e justificativas dos participantes originais. Faltas justificadas continuam contando como faltas no resumo.

Faltam publicação, homologação e configuração da infraestrutura definitiva do cliente.
