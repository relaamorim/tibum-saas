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
| **Membros** | Convite por email — técnicos/admins com permissões diferentes |
| **Planos** | Estrutura de assinatura com limites por plano |
| **Auditoria** | Log completo de todas as ações por workspace |
| **Super Admin** | Painel exclusivo do criador: bloquear, desbloquear, trocar plano e excluir empresas |

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
supabase/schema.sql                   → tabelas base (v1)
supabase/migration_v2_saas.sql        → multi-tenant, roles, planos, audit
supabase/migration_v3_super_admin.sql → bloqueio de workspaces + índices
supabase/migration_v4_admin_contact.sql → contatos do admin + nome do membro
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
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (secreta) — bypass RLS para APIs admin |
| `SUPER_ADMIN_EMAIL` | Email do criador da plataforma — acesso ao `/super-admin` |

> Obtenha `SUPABASE_URL`, `ANON_KEY` e `SERVICE_ROLE_KEY` em: **Supabase Dashboard → Settings → API**

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no frontend. Use apenas em API routes server-side.

---

## 📁 Estrutura do Projeto

```
tibum-saas/
├── src/
│   ├── app/                            # Rotas e páginas (Next.js App Router)
│   │   ├── (dashboard)/                # Área autenticada (layout com sidebar)
│   │   │   ├── dashboard/              # Dashboard principal
│   │   │   ├── clientes/               # Módulo de clientes
│   │   │   ├── agenda/                 # Módulo de agendamentos
│   │   │   ├── servicos/               # Módulo de serviços
│   │   │   ├── financeiro/             # Módulo financeiro
│   │   │   └── configuracoes/          # Configurações (somente admin)
│   │   │       └── membros/            # Gerenciamento de membros
│   │   ├── api/
│   │   │   ├── workspace/
│   │   │   │   └── members/route.ts    # POST — convite de membro por email
│   │   │   └── super-admin/
│   │   │       └── workspaces/
│   │   │           ├── route.ts        # GET — lista todas as empresas
│   │   │           └── [id]/route.ts   # PATCH (block/unblock/set_plan) + DELETE
│   │   ├── super-admin/                # Painel exclusivo do criador
│   │   ├── bloqueado/                  # Página exibida quando workspace está bloqueado
│   │   ├── login/                      # Autenticação
│   │   └── onboarding/                 # Criação de workspace
│   ├── components/
│   │   ├── ui/                         # Componentes base reutilizáveis
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── workspace-provider.tsx      # React Context global de workspace
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # Cliente browser (anon key)
│   │   │   ├── server.ts               # Cliente server (anon key + cookies)
│   │   │   ├── admin.ts                # Cliente admin (service role key)
│   │   │   └── middleware.ts           # Auth + workspace routing + RBAC
│   │   └── whatsapp.ts                 # Abstração de notificações (plug-in)
│   ├── services/                       # Camada de acesso ao banco (CRUD + audit)
│   ├── types/
│   │   └── database.ts                 # Tipos TypeScript completos
│   └── middleware.ts                   # Entrada do middleware Next.js
├── supabase/
│   ├── schema.sql                      # Schema base (v1)
│   ├── migration_v2_saas.sql           # Migração SaaS multi-tenant (v2)
│   ├── migration_v3_super_admin.sql    # Bloqueio de workspaces (v3)
│   └── migration_v4_admin_contact.sql  # Contatos do admin + nome do membro (v4)
└── docs/                               # Documentação técnica
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

## 🛡️ Super Admin

O criador da plataforma acessa `/super-admin` com o email configurado em `SUPER_ADMIN_EMAIL`.

Funcionalidades exclusivas:
- Listar todas as empresas cadastradas com plano, membros e clientes
- Bloquear empresa (impede acesso ao dashboard)
- Desbloquear empresa
- Trocar plano manualmente
- Excluir empresa (cascade — libera o slug para reutilização)

→ Veja [docs/architecture.md#super-admin](docs/architecture.md)

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
| [docs/api.md](docs/api.md) | Camada de serviços e API routes |
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
