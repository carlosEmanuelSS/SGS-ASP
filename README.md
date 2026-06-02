# 🏫 SGS-ASP — Sistema de Gestão Social

**Plataforma web para centralização de dados, controle de atividades, registro de frequência e automação de relatórios da ONG Ação Social do Planalto (ASP).**

O **SGS-ASP** é um projeto acadêmico desenvolvido na disciplina **Projeto Integrador I**, do curso de **Análise e Desenvolvimento de Sistemas — CEUB**. A solução foi proposta para apoiar a **Ação Social do Planalto**, instituição que atua no acolhimento e acompanhamento de crianças e adolescentes em situação de vulnerabilidade social no Distrito Federal.

---

## 🔗 Acesso Rápido

| Recurso                    | Link                                                            |
| -------------------------- | --------------------------------------------------------------- |
| 📄 Documentação Geral      | [Acessar pasta docs](./docs)                                    |
| 📘 Entregáveis da Sprint 1 | [Acessar Sprint 1](./docs/sprint1)                              |
| 📙 Entregáveis da Sprint 2 | [Acessar Sprint 2](./docs/sprint2)                              |
| 💻 Código do Protótipo     | [Acessar protótipo](./prototipo)                                |
| 🌐 Protótipo publicado     | [Acessar Vercel](https://sgs-asp.vercel.app)                    |
| 📚 Wiki do Projeto         | [Acessar Wiki](https://github.com/carlosEmanuelSS/SGS-ASP/wiki) |

---

## 🎯 Objetivo do Projeto

O projeto tem como objetivo desenvolver um protótipo funcional de sistema web para reduzir a fragmentação de dados e o retrabalho operacional da ONG.

Atualmente, informações importantes podem ficar distribuídas entre diferentes ferramentas, como planilhas, registros manuais e sistemas paralelos. O SGS-ASP propõe uma solução integrada para centralizar dados de educandos, famílias, oficinas, frequência, atendimentos e relatórios.

---

## 📌 Escopo do MVP

O MVP do SGS-ASP prioriza os fluxos mais importantes para a rotina da instituição:

* Cadastro e consulta de educandos;
* Organização de oficinas e turmas;
* Registro digital de frequência;
* Visualização de indicadores no dashboard;
* Apoio à geração de relatórios;
* Estrutura inicial para controle de acesso e sigilo.

> Nesta etapa, o sistema está em fase de protótipo funcional, com persistência de dados simulada no navegador.

---

## 📁 Estrutura do Repositório

```txt
SGS-ASP/
├── docs/
│   ├── sprint1/
│   └── sprint2/
│
├── prototipo/
│   └── código-fonte do protótipo React/Vite
│
├── README.md
└── .gitignore
```

### Organização

| Pasta           | Descrição                                   |
| --------------- | ------------------------------------------- |
| `docs/`         | Documentação acadêmica do projeto           |
| `docs/sprint1/` | Entregáveis da Sprint 1                     |
| `docs/sprint2/` | Documento técnico e entregáveis da Sprint 2 |
| `prototipo/`    | Código-fonte do protótipo funcional         |

---

## 📄 Documentação

Os documentos acadêmicos do projeto estão disponíveis na pasta `docs`.

### Sprint 1

A pasta `docs/sprint1/` contém os documentos iniciais do projeto, como:

* Documento de Visão;
* Documento de Requisitos;
* Protótipo de Interfaces do MVP;
* Refinamento do Backlog.

### Sprint 2

A pasta `docs/sprint2/` contém a documentação técnica da Sprint 2, incluindo:

* Documento Técnico Breve da Sprint 2;
* Registro da evolução do protótipo;
* Decisões técnicas;
* Incrementos funcionais realizados.

A Wiki do projeto também pode ser utilizada para centralizar informações complementares, como histórico do projeto, organização da equipe, backlog, decisões técnicas e registros de acompanhamento.

---

## 🚀 Tecnologias Utilizadas

| Tecnologia                  | Função                                            |
| --------------------------- | ------------------------------------------------- |
| **React**                   | Construção da interface do protótipo              |
| **TypeScript / JavaScript** | Lógica e estrutura da aplicação                   |
| **Vite**                    | Ferramenta de build e desenvolvimento             |
| **Tailwind CSS**            | Estilização da interface                          |
| **shadcn/ui**               | Componentes visuais                               |
| **Lucide Icons**            | Ícones da aplicação                               |
| **Recharts**                | Gráficos e indicadores                            |
| **LocalStorage API**        | Simulação de persistência de dados no navegador   |
| **GitHub**                  | Versionamento do código                           |
| **Vercel**                  | Publicação do protótipo funcional                 |
| **Jira Software**           | Organização do backlog e acompanhamento da Sprint |

---

## 🏗️ Módulos do Protótipo

O protótipo funcional contempla os principais módulos planejados para o MVP:

* **Dashboard Executivo:** exibição de indicadores, gráficos e atividades recentes;
* **Educandos:** cadastro e consulta de informações dos jovens atendidos;
* **Oficinas:** organização de atividades, turmas e limites de vagas;
* **Frequência:** simulação do registro digital de presença dos educandos;
* **Atendimentos:** estrutura inicial para acompanhamento técnico;
* **Relatórios:** apoio à visualização e consolidação de dados gerenciais.

---

## ☁️ Deploy do Protótipo

O protótipo está publicado na **Vercel**.

**Link do protótipo:** [Acessar protótipo publicado](https://sgs-asp.vercel.app)

> Observação: como o código do protótipo está dentro da pasta `prototipo/`, o deploy na Vercel utiliza `prototipo` como **Root Directory**.

---

## 🛠️ Como Rodar o Protótipo Localmente

### Pré-requisitos

* [Git](https://git-scm.com/)
* [Node.js](https://nodejs.org/) versão 18 ou superior

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/carlosEmanuelSS/SGS-ASP.git

# 2. Entre na pasta do protótipo
cd SGS-ASP/prototipo

# 3. Instale as dependências
npm install

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Após executar o comando, o terminal exibirá a URL local do protótipo, geralmente:

```bash
http://localhost:5173
```

---

## 👥 Equipe

| Integrante                     | Papel         |
| ------------------------------ | ------------- |
| Carlos Emanuel Santos da Silva | Product Owner |
| Gustavo Augusto                | Scrum Master  |
| Bruno Santos                   | Desenvolvedor |

---

## 🎓 Informações Acadêmicas

**Instituição:** Centro Universitário de Brasília — CEUB
**Curso:** Análise e Desenvolvimento de Sistemas
**Disciplina:** Projeto Integrador I
**Projeto:** Sistema de Gestão Social ASP
**Cliente:** ONG Ação Social do Planalto

---

## 📌 Status do Projeto

O SGS-ASP encontra-se em fase de **protótipo funcional**, com evolução incremental realizada durante as Sprints. A Sprint 2 concentrou-se na definição técnica, organização da arquitetura do protótipo, implementação de novos fluxos e documentação da entrega parcial.

---

> Projeto acadêmico desenvolvido para fins de aprendizagem, documentação, prototipação e aplicação prática dos conceitos de Engenharia de Software, Scrum e desenvolvimento web.
