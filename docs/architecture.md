# Arquitetura — TiBum SaaS

## Visão Geral

O TiBum é uma aplicação SaaS multi-tenant construída com Next.js (frontend + API routes) e Supabase (banco de dados, autenticação e RLS).

```
Browser
  └── Next.js App (Vercel)
        ├── Middleware (auth + workspace routing + super admin)
        ├── React Components (client-side)
        ├── API Routes (server-side — usa service role key)
        └── Supabase Client SDK
              └── Supabase (PostgreSQL + Auth + RLS)
```

---

## Multi-Tenancy

### Modelo de Isolamento
Cada empresa é representada por um **workspace**. O isolamento é garantido em duas camadas:

**1. Row Level Security (banco)**
Todas as tabelas têm políticas RLS que filtram por `workspace_id`:
```sql
-- Exemplo: clientes
CREATE POLICY "acesso por workspace"
ON customers FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid()
  )
);
```

**2. Middleware Next.js**
Verifica se o usuário tem workspace antes de renderizar qualquer página do dashboard. Sem workspace → redirect para `/onboarding`.

### Backward Compatibility
Dados criados antes da v2 (com apenas `user_id`) continuam protegidos pela policy `user_id = auth.uid()`. Os dois mecanismos coexistem na mesma policy RLS.

---

## Autenticação e Autorização

### Fluxo de Auth
```
1. Usuário acessa qualquer rota
2. Middleware verifica sessão Supabase
3. Sem sessão → /login
4. Com sessão, sem workspace → /onboarding
5. Com workspace bloqueado → /bloqueado
6. Com workspace ativo → dashboard (role verificado)
```

### RBAC (Roles)
| Role | Nível | Capacidades |
|---|---|---|
| `admin` | Workspace | Full access — configurações, membros, exclusão |
| `technician` | Workspace | Create + read — sem exclusão, sem configurações |

A verificação de role acontece:
- **Middleware:** bloqueia rotas `/configuracoes/*` para não-admins
- **UI:** esconde botões de exclusão e menu de Administração
- **RLS:** policies de escrita nas tabelas de configuração

---

## Super Admin

O criador da plataforma TiBum tem acesso exclusivo ao painel `/super-admin`.

### Identificação
Verificada por email no middleware e nas API routes:
```typescript
user.email === process.env.SUPER_ADMIN_EMAIL
```
Nenhuma tabela adicional é necessária — a verificação é feita contra a variável de ambiente `SUPER_ADMIN_EMAIL`.

### Proteção em Dupla Camada
1. **Middleware (Edge Runtime):** redireciona para `/dashboard` se não for super admin
2. **Server component layout:** verifica novamente antes de renderizar o painel
3. **API routes:** cada rota verifica independentemente

### Operações do Super Admin
Todas as operações usam o `createAdminClient()` (service role key) para bypass total de RLS:

| Operação | Endpoint |
|---|---|
| Listar todas as empresas | `GET /api/super-admin/workspaces` |
| Bloquear empresa | `PATCH /api/super-admin/workspaces/[id]` `{ action: 'block' }` |
| Desbloquear empresa | `PATCH /api/super-admin/workspaces/[id]` `{ action: 'unblock' }` |
| Trocar plano | `PATCH /api/super-admin/workspaces/[id]` `{ action: 'set_plan' }` |
| Excluir empresa | `DELETE /api/super-admin/workspaces/[id]` |

### Bloqueio de Workspace
Quando uma empresa é bloqueada:
1. `workspaces.is_blocked = true` no banco
2. `WorkspaceProvider` detecta o bloqueio no carregamento
3. Usuário é redirecionado para `/bloqueado?empresa=...&motivo=...`
4. A página `/bloqueado` está fora do layout de dashboard (sem WorkspaceProvider) — evita loop

---

## Clientes Supabase

O projeto usa dois clientes Supabase distintos:

| Cliente | Arquivo | Chave | Contexto de uso |
|---|---|---|---|
| **Browser** | `src/lib/supabase/client.ts` | `ANON_KEY` | Componentes client-side |
| **Server** | `src/lib/supabase/server.ts` | `ANON_KEY` + cookies | Server Components, API Routes normais |
| **Admin** | `src/lib/supabase/admin.ts` | `SERVICE_ROLE_KEY` | API Routes privilegiadas (super admin, convite de membros) |

> ⚠️ O cliente admin bypassa todo o RLS. **Nunca** usar client-side.

---

## Convite de Membros

O admin da empresa convida técnicos por nome + email (sem necessidade de UUID):

```
1. Admin preenche nome + email + função no modal
2. Frontend chama POST /api/workspace/members
3. API route (server-side):
   a. Verifica que o chamador é admin do workspace
   b. Chama supabase.auth.admin.inviteUserByEmail(email)
   c. Insere em workspace_members com o user_id retornado
4. Técnico recebe email com link de acesso
5. Técnico clica → é autenticado → WorkspaceProvider carrega o workspace
```

---

## Contexto de Workspace (Frontend)

O `WorkspaceProvider` (React Context) carrega e disponibiliza globalmente:
- `workspace` — dados da empresa
- `role` — role do usuário logado
- `subscription` — assinatura ativa
- `plan` — plano atual
- `isAdmin` — boolean de conveniência
- `refresh()` — força recarga do contexto

Todos os componentes do dashboard consomem via `useWorkspace()`.

---

## Estrutura de Pastas

```
src/
├── app/             # Rotas (Next.js App Router)
│   ├── (dashboard)/ # Área autenticada
│   ├── api/         # API Routes server-side
│   ├── super-admin/ # Painel do criador
│   ├── bloqueado/   # Página de empresa bloqueada
│   ├── login/       # Autenticação
│   └── onboarding/  # Criação de workspace
├── components/      # UI reutilizável + providers
├── lib/             # Infraestrutura (Supabase, WhatsApp)
├── services/        # Acesso ao banco (CRUD por entidade)
├── types/           # Tipos TypeScript globais
└── middleware.ts    # Auth + routing guard + super admin
```

### Camada de Serviços
Cada entidade tem seu arquivo em `src/services/`:
- Recebe um `SupabaseClient` como parâmetro (injeção explícita)
- Aceita `workspaceId` opcional (backward compatible)
- Chama `logAudit()` em todas as mutações

---

## Decisões Técnicas

| Decisão | Motivo |
|---|---|
| App Router (Next.js) | Melhor suporte a Server Components e middleware |
| Supabase como BaaS | Auth + DB + RLS em uma plataforma — rápido para MVP |
| RLS no banco | Segurança garantida mesmo se a app tiver bugs |
| Service role key em API routes | Operações admin precisam bypass de RLS (super admin, convite) |
| `SUPER_ADMIN_EMAIL` via env var | Mais simples que tabela de roles — sem risco de escalada de privilégios |
| `workspaceId` opcional nos services | Backward compatibility com dados da v1 |
| Audit log client-side | Simplicidade para MVP; pode migrar para triggers SQL |
| WhatsApp via abstração | Plug-in — troca de provedor sem mudar o restante do código |
| Tailwind CSS 4 | Zero config, purge automático, design system consistente |
| Convite por email (não UUID) | UX do admin — não exige que o técnico tenha conta prévia |

---

## Segurança

- Senhas gerenciadas pelo Supabase Auth (bcrypt)
- Tokens JWT com refresh automático via `@supabase/ssr`
- RLS garante isolamento de dados no banco
- `.env.local` nunca commitado (`.gitignore`)
- Variáveis `NEXT_PUBLIC_` são seguras (apenas chave anon do Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` e `SUPER_ADMIN_EMAIL` são server-only (sem prefixo `NEXT_PUBLIC_`)
- Middleware valida sessão em toda requisição

---

## Integrações Futuras

| Integração | Arquivo | Status |
|---|---|---|
| Stripe (billing) | `src/app/api/stripe/` | Não implementado |
| WhatsApp (Z-API/Twilio) | `src/lib/whatsapp.ts` | Abstração pronta |
| Email (Resend/SendGrid) | `src/lib/email.ts` | Não implementado |
| Analytics | `src/app/layout.tsx` | Não implementado |
