# Sistema de Gestão Social ASP

**Plataforma para centralização de dados, controle de atividades e automação de relatórios da ONG Ação Social do Planalto.**

> 📄 **Documentação Completa:** Acesse nossa Wiki (ou pasta `/docs`) para ver a documentação central do projeto, incluindo Documento de Visão, Requisitos de Software, Design Thinking e Plano de Projeto.

---

## Índice
* [Visão Geral](#-visão-geral)
* [Funcionalidades](#-funcionalidades-esperadas)
* [Arquitetura e Segurança](#️-arquitetura-e-segurança)
* [Stack Tecnológico](#️-stack-tecnológico)
* [Estrutura do Projeto](#-estrutura-do-projeto)
* [Equipe do Projeto](#-equipe-do-projeto)

---

## Visão Geral
Este projeto é desenvolvido para a **Ação Social do Planalto (ASP)**, uma instituição com 60 anos de história que acolhe crianças e adolescentes em situação de vulnerabilidade social no Distrito Federal. 

Atualmente, a instituição sofre com retrabalho, pois utiliza de forma fragmentada o sistema Bússola Social, planilhas eletrônicas e o Trello, enfrentando limitações de personalização e falhas operacionais. O nosso sistema atua como uma **Fonte Única da Verdade (SSoT)**, centralizando informações em uma aplicação web para:
* Garantir um acompanhamento contínuo e organizado do histórico dos educandos.
* Automatizar a geração de relatórios dinâmicos para prestação de contas.
* Apoiar a tomada de decisão da gestão administrativa e pedagógica através de indicadores.

---

## Funcionalidades Esperadas
* **Cadastro Integrado:** Registro completo de educandos e do seu núcleo familiar, evitando dados duplicados.
* **Gestão de Oficinas:** Criação de atividades, alocação de turmas e controle diário de presença pelos educadores.
* **Atendimentos e Sigilo:** Registro de acompanhamentos com controle de nível de acesso, garantindo que atendimentos sensíveis da equipe técnica sejam mantidos como confidenciais.
* **Automação de Relatórios:** Geração ágil de relatórios com filtros cruzados (por período, atividade e educador) sem depender de processos manuais.
* **Dashboard de Indicadores:** Visualização clara de métricas como quantidade de atendidos e taxa de ocupação.

---

## Arquitetura e Segurança
Conforme alinhamento técnico para garantir um sistema escalável e seguro:
* **Banco de Dados Relacional:** Estruturação lógica que conecta o educando, sua família e seu histórico de presença, evitando inconsistências.
* **Segurança da Informação:** Criptografia de senhas, proteção contra injeção de código e registro de *logs* (rastreabilidade de ações).
* **Controle de Acesso (Perfis):** Níveis de permissão definidos para Administrador, Secretaria, Coordenação, Educadores e Equipe Técnica.
* **Usabilidade:** Interface web simples e intuitiva, com telas limpas e poucos cliques, focando na produtividade da equipe da ASP.

---

## Stack Tecnológico
* **Frontend:** React / JavaScript / TypeScript / HTML + CSS
* **Backend:** Java (Spring)
* **Banco de Dados:** PostgreSQL (Relacional)
* **Gestão e Design:** Azure DevOps (Gerenciamento Ágil), GitHub, Miro/Figma.

---


## Equipe do Projeto

Nome | Papel
---- | ----
Carlos Emanuel | Product Owner
Gustavo Augusto | Scrum Master
Bruno Santos | Desenvolvedor

## 📁 Estrutura do Projeto
```text
Projeto-ASP/
├── docs/                  # Hub de Documentação (Visão, Requisitos, Sprints)
├── frontend/              # Código fonte da interface web
├── backend/               # Código fonte da API e regras de negócio
└── README.md              # Este arquivo


