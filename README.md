# 🏫 SGS ASP — Sistema de Gestão Social

**Plataforma web para centralização de dados, controle de atividades e automação de relatórios da ONG Ação Social do Planalto (ASP).**

Projeto acadêmico desenvolvido para a **Ação Social do Planalto**, uma instituição com 60 anos de história que acolhe crianças e adolescentes em situação de vulnerabilidade social no Distrito Federal.

---

## 📁 Estrutura do Repositório

```
SGS-ASP/
├── docs/                   # Documentação acadêmica do projeto
│   ├── sprint1/            # Artefatos da Sprint 1 (Visão, Requisitos, Design Thinking)
│   ├── sprint2/            # Artefatos da Sprint 2
│   ├── evidencias/         # Evidências e registros de entregas
│   └── MANUAL_DO_USUARIO.md
│
├── prototipo/              # Código-fonte do protótipo funcional
│   ├── src/                # Componentes React e lógica da aplicação
│   ├── index.html          # Ponto de entrada HTML
│   ├── package.json        # Dependências e scripts do projeto
│   ├── vite.config.ts      # Configuração do Vite (Build Tool)
│   ├── tailwind.config.js  # Configuração do Tailwind CSS
│   ├── tsconfig.json       # Configuração do TypeScript
│   └── ...                 # Demais arquivos de configuração
│
├── README.md               # Este arquivo
└── .gitignore
```

---

## 🚀 Tecnologias do Protótipo

| Tecnologia | Função |
|---|---|
| **React 18** | Biblioteca de interface (SPA) |
| **TypeScript** | Tipagem estática e segurança |
| **Vite** | Build tool de alta performance |
| **Tailwind CSS** | Estilização utilitária |
| **shadcn/ui + Lucide Icons** | Componentes e iconografia |
| **Recharts** | Gráficos analíticos dinâmicos |
| **LocalStorage API** | Persistência de dados no navegador |

---

## 🛠️ Como rodar o protótipo localmente

### Pré-requisitos
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) (v18+)

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

O terminal exibirá a URL local (geralmente `http://localhost:5173`).

---

## 🏗️ Módulos do Sistema

- **Dashboard Executivo** — KPIs, gráficos de ocupação e feed de atividades
- **Educandos** — Cadastro completo com dados biopsicossociais e núcleo familiar
- **Oficinas** — Gestão de turmas com controle de vagas e limite de matrículas
- **Diário de Frequência** — Chamada rápida com presença preenchida por padrão
- **Atendimentos** — Prontuário técnico com controle de sigilo (Público/Confidencial)
- **Relatórios** — Dashboard executivo com filtros cruzados e exportação

---

## 👥 Equipe do Projeto

| Nome | Papel |
|---|---|
| Carlos Emanuel | Product Owner |
| Gustavo Augusto | Scrum Master |
| Bruno Santos | Desenvolvedor |

---

## ☁️ Deploy

O protótipo está publicado na **Vercel**. O Root Directory do deploy é configurado como `prototipo`.

---

*Projeto acadêmico — Ação Social do Planalto (ASP)*
