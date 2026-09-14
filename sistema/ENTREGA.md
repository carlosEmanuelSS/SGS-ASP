# Entrega técnica — 13/09/2026

## Resultado

A versão real agora possui sete áreas navegáveis: Visão geral, Alunos, Oficinas e matrículas, Frequência, Atendimentos, Doações e Relatórios. Usa React/TypeScript, API Django, sessões autenticadas e persistência em SQLite para uso local ou PostgreSQL para produção. Não há dados fictícios automáticos no banco normal.

O protótipo e os documentos acadêmicos foram preservados. A identidade visual existente e a barra lateral foram mantidas. Novas permissões foram acrescentadas sem remover os fluxos anteriores.

## Cobertura do escopo documentado

| Referência | Entrega |
| --- | --- |
| RF-01 / US01 | Cadastro persistente, validação, busca, paginação, edição e situações dos alunos |
| RF-09 / US02 | Turmas com limite de vagas e matrículas protegidas contra concorrência |
| RF-14 / US03 | Frequência por turma/data, educadores vinculados e correção auditada |
| RF-15 / US04 | Ficha com matrículas, frequência, histórico cadastral e atendimentos versionados |
| RF-35 / US05 | Doações recebidas com data, tipo, valor ou quantidade/unidade |
| RNF-01 | Autenticação, proteção CSRF, bloqueio de tentativas, grupos e acesso por registro/turma |
| Indicadores e relatórios | Totais do banco, ocupação, faixa etária, faltas, atendimentos acessíveis, doações e CSV |

As regras novas de sigilo, autoria, cancelamento e consolidação estão explicitadas no [manual](./MANUAL.md). Não foi presumida homologação pelo cliente.

## Verificações executadas

- **PostgreSQL:** 63 testes passaram, nenhum ignorado. Inclui disputa por vagas, chamadas e correções simultâneas, permissões e transações.
- **SQLite:** 57 testes passaram; seis específicos de PostgreSQL/concorrência foram ignorados, total de 63 descobertos.
- **Recuperação:** backup e restauração em destinos isolados nos dois bancos. No PostgreSQL, dados, histórico, migrações e chaves estrangeiras foram conferidos após restaurar.
- **Navegador Edge:** criação e correção de atendimento, histórico original, persistência após recarga, integração na ficha, sigilo entre usuários, doação, cancelamento, CSV, chamada do educador, troca de senha e nova autenticação.
- **Responsividade:** navegação e módulos verificados de 320 a 1440 pixels, sem rolagem horizontal do documento. Tabelas largas têm rolagem dentro do próprio bloco.
- **Build:** TypeScript e Vite aprovados. Configuração e testes do Playwright também possuem verificação de tipos.
- **Segurança de dependências:** npm audit e pip-audit sem vulnerabilidades conhecidas reportadas na execução.
- **Produção local:** Waitress com PostgreSQL e frontend compilado respondeu corretamente; arquivos estáticos, cookies Secure, HSTS, CSP, bloqueio anônimo, CSRF e redirecionamento HTTPS conferidos. A terminação TLS foi simulada por um proxy de confiança local; não foi emitido certificado público.
- **Configuração:** `manage.py check --deploy --fail-level WARNING` sem problemas; migrações versionadas sem alterações pendentes.
- **Privilégios do banco:** inicialização e migrações verificadas com a conta `sgs` limitada; tentativas de criar outra conta ou outro banco foram negadas.

Os testes automatizados criam bases/contas fictícias isoladas. Não dependem de adulterar os dados do usuário.

## Atualização local aplicada

A migração `gestao.0001_initial` foi aplicada ao SQLite da instalação local e os perfis foram atualizados. Antes disso foi criado `backups/antes-entrega-final-20260913.sqlite3`, fora do Git. A comparação de oito tabelas confirmou que alunos, histórico cadastral, oficinas, matrículas, eventos, chamadas, presenças e revisões anteriores foram preservados.

Backend e frontend foram iniciados em `127.0.0.1:8000` e `127.0.0.1:5173`. Atualize a página para carregar as novas permissões e áreas.

## Arquivos de operação

- [MANUAL.md](./MANUAL.md): uso e matriz dos perfis.
- [OPERACAO.md](./OPERACAO.md): atualização, implantação, backup e recuperação.
- `compose.prod.yaml`, `Dockerfile` e `deploy/`: aplicação, PostgreSQL, proxy HTTPS e rotina de backup.
- `.github/workflows/sistema.yml`: testes dos bancos, navegador, auditorias e smoke test em contêiner.
- `frontend/e2e/`: fluxo integrado reproduzível pelo comando `npm run test:e2e`.

## Dependências externas ainda abertas

1. **GitHub:** o envio remoto encontrou ausência de autenticação neste ambiente. A entrega local pode ser versionada e enviada quando houver uma conta autorizada. Não há PR, CI remota aprovada nem atualização da branch principal comprovadas.
2. **Hospedagem:** nenhum servidor/domínio/credenciais de produção foi fornecido. A configuração está preparada, mas o serviço não foi publicado na internet.
3. **Contêiner:** Docker não está instalado neste computador. O servidor de produção foi executado diretamente; build e smoke test Docker estão configurados para o pipeline, ainda sem execução remota.
4. **Continuidade:** cópia externa criptografada, retenção, monitoramento e alertas dependem da infraestrutura contratada. O backup diário local não substitui essa configuração.
5. **Aceite da ASP:** a equipe precisa validar os fluxos e os perfis com dados de homologação. Os campos além dos requisitos documentados — anexos, documentos adicionais, consentimentos e integrações — não foram inventados.

Estes testes sustentam a entrega técnica local; não constituem garantia de ausência de vulnerabilidades nem substituem a validação do ambiente definitivo. A versão não deve ser anunciada como “100% em produção” enquanto essas dependências estiverem abertas.
