# Arquitetura — TiBum SaaS

## Visão Geral

O TiBum é uma aplicação SaaS multi-tenant construída com Next.js (frontend + API routes) e Supabase (banco de dados, autenticação e RLS).

```
Browser
  └── Next.js App (Vercel)
        ├── Middleware (auth + workspace routing)
        ├── React Components (client-side)
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
5. Com workspace → dashboard (role verificado)
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
├── components/      # UI reutilizável + providers
├── lib/             # Infraestrutura (Supabase, WhatsApp)
├── services/        # Acesso ao banco (CRUD por entidade)
├── types/           # Tipos TypeScript globais
└── middleware.ts    # Auth + routing guard
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
| `workspaceId` opcional nos services | Backward compatibility com dados da v1 |
| Audit log client-side | Simplicidade para MVP; pode migrar para triggers SQL |
| WhatsApp via abstração | Plug-in — troca de provedor sem mudar o restante do código |
| Tailwind CSS 4 | Zero config, purge automático, design system consistente |

---

## Segurança

- Senhas gerenciadas pelo Supabase Auth (bcrypt)
- Tokens JWT com refresh automático via `@supabase/ssr`
- RLS garante isolamento de dados no banco
- `.env.local` nunca commitado (`.gitignore`)
- Variáveis `NEXT_PUBLIC_` são seguras (apenas chave anon do Supabase)
- Middleware valida sessão em toda requisição

---

## Integrações Futuras

| Integração | Arquivo | Status |
|---|---|---|
| Stripe (billing) | `src/app/api/stripe/` | Não implementado |
| WhatsApp (Z-API/Twilio) | `src/lib/whatsapp.ts` | Abstração pronta |
| Email (Resend/SendGrid) | `src/lib/email.ts` | Não implementado |
| Analytics | `src/app/layout.tsx` | Não implementado |
