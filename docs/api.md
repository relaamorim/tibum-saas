# Camada de Serviços e API Routes — TiBum SaaS

O TiBum usa dois mecanismos de acesso a dados:

1. **Serviços (`src/services/`)** — chamadas diretas ao Supabase via SDK client/server (respeitam RLS)
2. **API Routes (`src/app/api/`)** — rotas server-side que usam o cliente admin (bypass RLS) para operações privilegiadas

---

## Serviços (src/services/)

### Pattern de Serviço

Todos os serviços seguem o mesmo contrato:

```typescript
// Recebe o cliente Supabase (injeção explícita)
// workspaceId é opcional para backward compatibility
export async function createXxx(
  supabase: SupabaseClient,
  data: XxxForm,
  workspaceId?: string
): Promise<Xxx>
```

#### Por que injeção de `SupabaseClient`?
- Permite usar o cliente correto (browser vs server)
- Facilita testes (mock do cliente)
- Separação clara de responsabilidades

---

### `src/services/customers.ts`

```typescript
getCustomers(supabase, workspaceId?)          // Lista todos
getCustomer(supabase, id)                      // Busca por ID
createCustomer(supabase, form, workspaceId?)   // Cria + audit log
updateCustomer(supabase, id, form, workspaceId?) // Atualiza + audit log
deleteCustomer(supabase, id, workspaceId?)     // Remove + audit log
```

### `src/services/schedules.ts`

```typescript
getSchedules(supabase, filters?, workspaceId?)
getUpcomingSchedules(supabase, limit?, workspaceId?)
createSchedule(supabase, form, workspaceId?)
updateSchedule(supabase, id, form, workspaceId?)
deleteSchedule(supabase, id, workspaceId?)
```

**Filtros disponíveis:**
- `status`: `agendado` | `concluido` | `atrasado`

### `src/services/services.ts`

```typescript
getServices(supabase, workspaceId?)
createService(supabase, form, workspaceId?)
updateService(supabase, id, form, workspaceId?)
deleteService(supabase, id, workspaceId?)
```

### `src/services/payments.ts`

```typescript
getPayments(supabase, filters?, workspaceId?)
createPayment(supabase, form, workspaceId?)
markAsPaid(supabase, id, workspaceId?)       // Shortcut: status='pago' + paid_at
getFinancialSummary(supabase, workspaceId?)  // { received, pending }
```

### `src/services/workspaces.ts`

```typescript
getUserWorkspace(supabase)                   // Workspace + role + plano do user logado
createWorkspace(supabase, name, slug, adminName?, adminEmail?, adminWhatsapp?)
updateWorkspace(supabase, id, data)

// Membros
getWorkspaceMembers(supabase, workspaceId)
updateMemberRole(supabase, memberId, role)
removeMember(supabase, memberId)

// Planos
getPlans(supabase)
checkCustomerLimit(supabase, workspaceId)    // { allowed, current, max }
checkMemberLimit(supabase, workspaceId)
```

> **Nota:** `inviteMember()` foi substituída pela API Route `POST /api/workspace/members`,
> que usa o cliente admin para criar a conta Supabase via `inviteUserByEmail`.

### `src/services/audit.ts`

```typescript
logAudit(supabase, options)                  // Registra ação (falha silenciosa)
getAuditLogs(supabase, workspaceId, options?) // Lista logs paginados
```

**`LogOptions`:**
```typescript
{
  workspaceId: string
  action: AuditAction           // 'create' | 'update' | 'delete' | 'invite' | 'role_change'
  resourceType: string          // 'customer' | 'schedule' | 'service' | 'payment' | 'member'
  resourceId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
```

---

## API Routes (src/app/api/)

As API Routes rodam server-side e podem usar o `createAdminClient()` (service role key) para operações que exigem bypass de RLS.

### Autenticação nas API Routes

Toda rota verifica o usuário via `createClient()` (cookie-based) antes de usar o cliente admin.

---

### `POST /api/workspace/members`

Convida um novo membro para o workspace por email.

**Autenticação:** usuário autenticado + admin do workspace

**Body:**
```typescript
{
  name: string          // Nome completo do membro
  email: string         // Email (conta será criada se não existir)
  role: 'admin' | 'technician'
  workspace_id: string
}
```

**Fluxo:**
1. Verifica que o chamador é admin do workspace
2. Chama `supabase.auth.admin.inviteUserByEmail(email)` — cria conta e envia email
3. Se email já existe no Supabase, busca o user ID e adiciona diretamente
4. Insere em `workspace_members` com `name`, `role`, `invited_by`
5. Retorna o membro criado

**Respostas:**
- `200` — `{ member: WorkspaceMember }`
- `401` — não autenticado
- `403` — não é admin do workspace
- `409` — usuário já é membro
- `400/500` — outros erros

---

### `GET /api/super-admin/workspaces`

Lista todas as empresas com plano, status e contadores.

**Autenticação:** `user.email === SUPER_ADMIN_EMAIL`

**Resposta:**
```typescript
{
  workspaces: WorkspaceAdminView[]   // Ver types/database.ts
  stats: {
    total: number
    blocked: number
    by_plan: Record<string, number>
  }
  plans: Plan[]                      // Planos disponíveis para o seletor
}
```

---

### `PATCH /api/super-admin/workspaces/[id]`

Executa ações administrativas em um workspace.

**Autenticação:** `user.email === SUPER_ADMIN_EMAIL`

**Body:**
```typescript
// Bloquear empresa
{ action: 'block', reason?: string }

// Desbloquear empresa
{ action: 'unblock' }

// Trocar plano manualmente
{ action: 'set_plan', plan_id: string }
```

**Comportamento de `set_plan`:**
- Se existe assinatura: atualiza `plan_id` e `status = 'active'`
- Se não existe: cria nova assinatura

---

### `DELETE /api/super-admin/workspaces/[id]`

Exclui workspace permanentemente.

**Autenticação:** `user.email === SUPER_ADMIN_EMAIL`

**Efeito cascade (automático pelo banco):**
- `workspace_members`, `subscriptions`, `audit_logs`
- `customers`, `schedules`, `services`, `payments`

O slug fica disponível para reutilização por outra empresa.

---

## WhatsApp (`src/lib/whatsapp.ts`)

Abstração pronta para integração. Hoje simula o envio (console.log).

```typescript
// Envia lembrete (simulado)
sendWhatsAppReminder(phone: string, message: string): Promise<WhatsAppPayload>

// Helpers para montar mensagens
buildScheduleReminder(customerName: string, date: string): string
buildPaymentReminder(customerName: string, amount: number): string
```

**Para integrar com API real**, substitua o bloco `// TODO` em `sendWhatsAppReminder`:
```typescript
// Exemplo Z-API:
await fetch(`${process.env.WHATSAPP_API_URL}/send-messages`, {
  method: 'POST',
  headers: { token: process.env.WHATSAPP_API_TOKEN! },
  body: JSON.stringify({ phone: payload.phone, message: payload.message }),
})
```

---

## Tratamento de Erros

- Todos os serviços lançam o erro do Supabase via `throw error`
- As páginas capturam com `try/catch` e exibem feedback para o usuário
- `logAudit()` é a exceção — falha silenciosa (não interrompe o fluxo principal)
- API Routes retornam `{ error: string }` com status HTTP adequado

---

## Uso nos Componentes

```typescript
'use client'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/workspace-provider'
import { getCustomers } from '@/services/customers'

export default function Page() {
  const supabase = createClient()
  const { workspace } = useWorkspace()

  async function load() {
    const data = await getCustomers(supabase, workspace?.id)
    // ...
  }
}
```

### Chamando uma API Route (ex: convite de membro)

```typescript
const res = await fetch('/api/workspace/members', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, role, workspace_id: workspace.id }),
})
const json = await res.json()
if (!res.ok) throw new Error(json.error)
```
