# Camada de Serviços (API) — TiBum SaaS

O TiBum não expõe uma REST API externa — a comunicação com o banco é feita diretamente via **Supabase Client SDK** através da camada de serviços em `src/services/`.

---

## Pattern de Serviço

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

### Por que injeção de `SupabaseClient`?
- Permite usar o cliente correto (browser vs server)
- Facilita testes (mock do cliente)
- Separação clara de responsabilidades

---

## Serviços Disponíveis

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
createWorkspace(supabase, name, slug)        // Cria workspace + membro admin + subscription
updateWorkspace(supabase, id, data)

// Membros
getWorkspaceMembers(supabase, workspaceId)
inviteMember(supabase, workspaceId, userId, role?)
updateMemberRole(supabase, memberId, role)
removeMember(supabase, memberId)

// Planos
getPlans(supabase)
checkCustomerLimit(supabase, workspaceId)    // { allowed, current, max }
checkMemberLimit(supabase, workspaceId)
```

### `src/services/audit.ts`

```typescript
logAudit(supabase, options)                  // Registra ação (falha silenciosa)
getAuditLogs(supabase, workspaceId, options?) // Lista logs paginados
```

**`LogOptions`:**
```typescript
{
  workspaceId: string
  action: AuditAction           // 'create' | 'update' | 'delete' | ...
  resourceType: string          // 'customer' | 'schedule' | ...
  resourceId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
```

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
