# 🏊 TiBum SaaS

**Plataforma SaaS de gestão para empresas de manutenção e lojas de piscinas.**

Gerencie clientes, agendamentos, serviços e financeiro em um único lugar — com arquitetura multi-tenant pronta para escalar.

---

## ✨ Funcionalidades

| Módulo | Descrição |
|---|---|
| **Autenticação** | Login e cadastro via Supabase Auth (email/senha) |
| **Onboarding** | Criação de workspace (empresa) com trial de 14 dias |
| **Clientes** | CRUD completo com tipo e tamanho de piscina |
| **Agenda** | Agendamentos com frequência (semanal/quinzenal/mensal) e status |
| **Serviços** | Registro de serviços realizados com produtos e fotos |
| **Financeiro** | Controle de pagamentos vinculados a serviços |
| **Membros** | Equipe com roles: `admin` e `technician` |
| **Planos** | Estrutura de assinatura com limites por plano |
| **Auditoria** | Log completo de todas as ações por workspace |

---

## 🧱 Stack

- **Frontend:** [Next.js 16](https://nextjs.org) (App Router, TypeScript)
- **Backend:** [Supabase](https://supabase.com) (Auth, PostgreSQL, Row Level Security)
- **Estilo:** [Tailwind CSS 4](https://tailwindcss.com)
- **Deploy:** Vercel (recomendado)

---

## 🚀 Instalação local

### 1. Clone o repositório
```bash
git clone https://github.com/seu-usuario/tibum-saas.git
cd tibum-saas
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env.local
```
Preencha com suas credenciais do Supabase (veja [Variáveis de Ambiente](#-variáveis-de-ambiente)).

### 4. Configure o banco de dados
No [Supabase SQL Editor](https://supabase.com/dashboard), execute em ordem:
```
supabase/schema.sql              → tabelas base
supabase/migration_v2_saas.sql   → multi-tenant, roles, planos, audit
```

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000).

---

## 🔐 Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima (pública) do Supabase |

> Obtenha em: **Supabase Dashboard → Settings → API**

---

## 📁 Estrutura do Projeto

```
tibum-saas/
├── src/
│   ├── app/                        # Rotas e páginas (Next.js App Router)
│   │   ├── (dashboard)/            # Área autenticada (layout com sidebar)
│   │   │   ├── dashboard/          # Dashboard principal
│   │   │   ├── clientes/           # Módulo de clientes
│   │   │   ├── agenda/             # Módulo de agendamentos
│   │   │   ├── servicos/           # Módulo de serviços
│   │   │   ├── financeiro/         # Módulo financeiro
│   │   │   └── configuracoes/      # Configurações (somente admin)
│   │   ├── login/                  # Autenticação
│   │   └── onboarding/             # Criação de workspace
│   ├── components/
│   │   ├── ui/                     # Componentes base reutilizáveis
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── workspace-provider.tsx  # React Context global de workspace
│   ├── lib/
│   │   ├── supabase/               # Clientes browser/server + middleware
│   │   └── whatsapp.ts             # Abstração de notificações (plug-in)
│   ├── services/                   # Camada de acesso ao banco (CRUD + audit)
│   ├── types/
│   │   └── database.ts             # Tipos TypeScript completos
│   └── middleware.ts               # Auth + workspace routing + RBAC
├── supabase/
│   ├── schema.sql                  # Schema base (v1)
│   └── migration_v2_saas.sql       # Migração SaaS multi-tenant (v2)
└── docs/                           # Documentação técnica
```

---

## 🏛️ Arquitetura Multi-Tenant

Cada empresa é um **workspace** isolado. Os dados são separados por `workspace_id` com Row Level Security no Supabase, garantindo que nenhum tenant acesse dados de outro.

**Backward compatible:** dados criados antes da v2 (com `user_id`) continuam funcionando.

→ Veja [docs/architecture.md](docs/architecture.md)

---

## 👥 Roles (RBAC)

| Role | Permissões |
|---|---|
| `admin` | Acesso total — configurações, membros, exclusão de registros |
| `technician` | Leitura + criação — sem exclusão e sem acesso às configurações |

---

## 📦 Planos de Assinatura

| Plano | Preço | Clientes | Membros |
|---|---|---|---|
| Gratuito | R$ 0/mês | 10 | 1 |
| Starter | R$ 49,90/mês | 50 | 3 |
| Pro | R$ 99,90/mês | Ilimitado | 10 |

Trial automático de 14 dias ao criar um workspace.

---

## 📄 Documentação

| Arquivo | Conteúdo |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Arquitetura, decisões técnicas e fluxos |
| [docs/database.md](docs/database.md) | Schema do banco e relações |
| [docs/api.md](docs/api.md) | Camada de serviços e patterns de uso |
| [docs/product.md](docs/product.md) | Visão do produto e personas |
| [docs/roadmap.md](docs/roadmap.md) | Roadmap de evolução |

---

## 🤝 Contribuindo

```bash
# Crie uma branch a partir de develop
git checkout develop
git checkout -b feat/minha-feature

# Desenvolva, commit e abra PR para develop
git commit -m "feat: descrição da feature"
git push origin feat/minha-feature
```

**Padrão de commits:** `feat:` · `fix:` · `chore:` · `docs:` · `refactor:`

---

## 📝 Licença

MIT © TiBum SaaS
