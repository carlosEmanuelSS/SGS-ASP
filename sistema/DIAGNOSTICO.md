# Verificação inicial do repositório

Data: 12/09/2026. Referência: branch `main`, commit `bcbe7ca5ca7b7ed742a3715c67d87ebf1f5d602e`.

## O que havia

| Pasta | Conteúdo encontrado |
| --- | --- |
| `docs/sprint1/` | Visão, requisitos, backlog, pesquisa e protótipos em PDF |
| `docs/sprint2/` | Documento técnico e manual do usuário |
| `entrega-final/` | Entrega acadêmica e refino da solução |
| `prototipo/` | Aplicação React/Vite/TypeScript com dashboard, educandos, oficinas, frequência, atendimentos e relatórios |

Não havia backend, esquema de banco compartilhado, migrações, autenticação efetiva ou testes automatizados no código da branch principal. O documento técnico apresenta backend, banco definitivo e controle de acesso como pendências; não estabelece fornecedor nem tecnologia de banco para a versão operacional.

O cadastro existente usa `localStorage`, popula dados fictícios automaticamente e gera IDs com `Date.now()`. O perfil visível é fixo. A confirmação de exclusão anuncia perda permanente, mas a implementação só altera o status para inativo. O histórico da ficha apresenta eventos fixos, sem registros reais de auditoria. Por isso, o protótipo não deve ser confundido com uma implantação para o cliente.

## Primeiro incremento

A pasta `sistema/` contém uma implementação separada para evoluir o produto. A organização do frontend divide a aplicação, o cliente HTTP e o módulo `features/alunos/`. No backend, `config/` reúne configuração e rotas; `alunos/` reúne modelos, formulário de validação, API, migrações e testes.

RF-01/US01 orienta o cadastro persistente com identificação única. RNF-01 orienta login e controle de acesso. O histórico de alterações cadastrais inicia o suporte ao RF-15, mas não entrega ainda o prontuário integrado de oficinas, presenças e atendimentos. A entrada em lista de espera segue o refino e a regra já presente no protótipo.

Os campos iniciais acompanham o modelo do protótipo. CPF foi tratado como opcional e validado quando informado; a definição final de obrigatoriedade e demais dados deve ser confirmada com a ASP. PostgreSQL e Django são decisões adotadas neste incremento, não escolhas previamente aprovadas pelo cliente.

## Verificação executada

- 10 testes automatizados do backend aprovados em SQLite: persistência entre sessões, validação, CPF opcional e único, edição, conflito de versão, ativação/inativação, motivo obrigatório, histórico, busca, filtros, paginação, permissões, CSRF, login, bloqueio de tentativas e logout.
- Verificação Django sem avisos e migração inicial aplicada em banco local vazio.
- Build TypeScript/Vite aprovado; auditoria npm da instalação sem vulnerabilidades reportadas.
- Fluxo automatizado no Edge sem erros JavaScript: login, cadastro, recarga, consulta, ativação, inativação, histórico e saída.
- Layout revisado em capturas de desktop e celular; ficha e formulário sem rolagem horizontal da página em 390 px.
- Os dados e a conta usados para testar a interface foram criados em banco separado na área temporária; não há dados fictícios nem senha padrão no banco da aplicação entregue.

PostgreSQL e o pipeline GitHub Actions foram configurados, mas não executados nesta máquina, que não tem Docker disponível. A publicação no GitHub, a implantação, a validação de infraestrutura e a homologação com usuários reais não foram realizadas. As alterações estão na cópia local, na branch `feat/cadastro-alunos`.

Consulte [README.md](./README.md) para executar, configurar perfis e preparar a homologação.
