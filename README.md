# 🏫 SGS ASP - Sistema de Gestão Social

**Plataforma para centralização de dados, controle de atividades e automação de relatórios da ONG Ação Social do Planalto.**

O **SGS ASP** é uma plataforma moderna desenvolvida especificamente para ONGs e Projetos de Serviço de Convivência (focada no atendimento a jovens vulneráveis). Construída como uma *Single Page Application (SPA)* com forte foco em produtividade (poucos cliques), a ferramenta unifica prontuários da Assistência Social, turmas de esportes/cultura e emissão de dados estatísticos.

---

## 🚀 Tecnologias Integradas
- **[React 18](https://react.dev/)**
- **[Vite](https://vitejs.dev/)** (Build Tool de alta performance)
- **[Tailwind CSS](https://tailwindcss.com/)** (Sistema de Estilização Utilitária)
- **[shadcn/ui](https://ui.shadcn.com/)** & **[Lucide Icons](https://lucide.dev/)** (Iconografia e Componentes Acessíveis)
- **[Recharts](https://recharts.org/)** (Gráficos Analíticos Dinâmicos)
- **LocalStorage API** (Simulação completa de Banco de Dados relacional, rodando 100% no navegador sem necessidade inicial de servidor REST).

---

## Visão Geral
Este projeto é desenvolvido para a **Ação Social do Planalto (ASP)**, uma instituição com 60 anos de história que acolhe crianças e adolescentes em situação de vulnerabilidade social no Distrito Federal.

Atualmente, a instituição sofre com retrabalho, pois utiliza de forma fragmentada o sistema Bússola Social, planilhas eletrônicas e o Trello, enfrentando limitações de personalização e falhas operacionais. O nosso sistema atua como uma **Fonte Única da Verdade (SSoT)**, centralizando informações em uma aplicação web para:
* Garantir um acompanhamento contínuo e organizado do histórico dos educandos.
* Automatizar a geração de relatórios dinâmicos para prestação de contas.
* Apoiar a tomada de decisão da gestão administrativa e pedagógica através de indicadores.

---

## 🛠️ Como baixar e rodar na sua máquina

Siga os passos abaixo para clonar e rodar o Sistema de Gestão no seu ambiente de desenvolvimento local.

### 1. Pré-requisitos
Antes de começar, certifique-se de ter instalado em sua máquina:
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en/) (Versão 18 ou superior)

### 2. Passo a Passo de Instalação

Abra o seu terminal (Prompt de Comando, PowerShell ou Git Bash) e execute os seguintes comandos:

**1. Clone o repositório do GitHub:**
```bash
git clone https://github.com/carlosEmanuelSS/SGS-ASP.git
```

**2. Acesse a pasta do projeto clonado:**
```bash
cd SGS-ASP
```

**3. Instale todas as dependências do projeto:**
*(Isso vai mapear o `package.json` e baixar o React, Tailwind, Recharts e demais módulos).*
```bash
npm install
```

**4. Inicie o Servidor Local de Desenvolvimento:**
```bash
npm run dev
```

**5. Acesse no Navegador:**
O terminal irá retornar um link local (geralmente `http://localhost:5173`). Segure a tecla `Ctrl` e clique no link ou copie e cole a URL no seu navegador favorito.

---

## 🏗️ Estrutura do Sistema (Módulos Principais)
- **Dashboard Executivo:** Painel reativo com KPIs vitais, Gráficos cruzados de ocupação e Feed de rastreabilidade do uso da plataforma.
- **Educandos:** Cadastro Completo (Dados biopsicossociais, Núcleo Familiar e Vínculos).
- **Oficinas:** Gestão de turmas com travas severas de limite de matrículas (Ex: "Lotada 100%").
- **Diário de Frequência:** Sistema Ultra-Rápido de chamadas preenchidas por padrão. Os educadores informam ativamente apenas as eventuais faltas do dia.
- **Prontuário Equipe Técnica (Atendimentos):** Bloqueio ético na leitura de documentos `Confidenciais`, e histórico inviolável sob a regra visual de `Cancelamento Lógico` ao invés de deleção de banco.

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
* **Frontend:** React / TypeScript / HTML + CSS
* **Estilização:** Tailwind CSS + shadcn/ui
* **Gráficos:** Recharts
* **Build Tool:** Vite
* **Gestão e Design:** Azure DevOps, GitHub, Miro/Figma

---

## 👥 Equipe do Projeto

Nome | Papel
---- | ----
Carlos Emanuel | Product Owner
Gustavo Augusto | Scrum Master
Bruno Santos | Desenvolvedor

---

### 💡 Modificando os "Bancos de Dados" Mockados
A aplicação utiliza o Cache do navegador para viver e transitar informações em tempo real entre as telas. Para `resetar` ou restaurar a plataforma aos padrões de fábrica estáticos (Mock Data), basta acessar `F12 > Application > Local Storage` no seu navegador e excluir as chaves que começam com `sgs_...`.

---
*Documentação gerada para escalabilidade do Projeto Social ASP.*
