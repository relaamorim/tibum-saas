# Banco de Dados — TiBum SaaS

## Visão Geral

PostgreSQL via Supabase. Row Level Security (RLS) habilitado em todas as tabelas.

Execute os arquivos na ordem:
1. `supabase/schema.sql` — tabelas base
2. `supabase/migration_v2_saas.sql` — extensão multi-tenant
3. `supabase/migration_v3_super_admin.sql` — bloqueio de workspaces
4. `supabase/migration_v4_admin_contact.sql` — contatos do admin + nome do membro

---

## Diagrama de Entidades

```
auth.users (Supabase)
    │
    ├── workspace_members ──── workspaces
    │         │                    │
    │         └── (role, name)     ├── subscriptions ── plans
    │                              │
    ├── customers ─────────────────┤
    │                              │
    ├── schedules ────────────────┤
    │       │                     │
    ├── services ◄────────────────┤
    │       │                     │
    └── payments                  └── audit_logs
            │
            └── (vinculado a service)
```

---

## Tabelas

### `workspaces`
Representa uma empresa (tenant).

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | Identificador único |
| `name` | text | Nome da empresa |
| `slug` | text UNIQUE | Identificador URL-friendly |
| `is_blocked` | boolean | Se a empresa está bloqueada pelo super admin |
| `blocked_at` | timestamptz | Quando foi bloqueada |
| `blocked_reason` | text | Motivo do bloqueio |
| `admin_email` | text | Email de contato do administrador |
| `admin_whatsapp` | text | WhatsApp de contato do administrador |
| `created_at` | timestamptz | Data de criação |
| `updated_at` | timestamptz | Última atualização |

**Campos adicionados por versão:**
- v3: `is_blocked`, `blocked_at`, `blocked_reason`
- v4: `admin_email`, `admin_whatsapp`

---

### `workspace_members`
Vínculo entre usuários e workspaces com role.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `workspace_id` | uuid FK → workspaces | — |
| `user_id` | uuid FK → auth.users | — |
| `role` | text | `admin` ou `technician` |
| `name` | text | Nome de exibição do membro |
| `invited_by` | uuid FK → auth.users | Quem convidou |
| `created_at` | timestamptz | — |

**Constraint:** `UNIQUE(workspace_id, user_id)`

**Campos adicionados por versão:**
- v4: `name`

---

### `plans`
Planos de assinatura disponíveis.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `name` | text | Nome do plano |
| `price_monthly` | decimal(10,2) | Preço mensal |
| `max_customers` | int | Limite de clientes (null = ∞) |
| `max_members` | int | Limite de membros (null = ∞) |
| `features` | jsonb | Array de features incluídas |
| `is_active` | boolean | Visível para novos clientes |

**Dados iniciais:** Gratuito · Starter · Pro

---

### `subscriptions`
Assinatura ativa de cada workspace.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `workspace_id` | uuid FK UNIQUE | Um workspace, uma assinatura |
| `plan_id` | uuid FK → plans | — |
| `status` | text | `trialing` · `active` · `canceled` · `past_due` |
| `trial_ends_at` | timestamptz | Fim do trial (padrão: +14 dias) |
| `current_period_start` | timestamptz | Início do ciclo atual |
| `current_period_end` | timestamptz | Fim do ciclo atual |
| `external_id` | text | ID no Stripe (futuro) |

---

### `customers`
Clientes cadastrados por workspace.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` | uuid | Quem criou (legado + auditoria) |
| `workspace_id` | uuid FK | Tenant owner |
| `name` | text | Nome do cliente |
| `phone` | text | Telefone |
| `address` | text | Endereço |
| `pool_type` | text | `fibra` · `vinil` · `concreto` |
| `pool_size` | text | Ex: "8x4m", "50.000L" |
| `created_at` / `updated_at` | timestamptz | — |

---

### `schedules`
Agendamentos de manutenção.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` / `workspace_id` | uuid | Dono |
| `customer_id` | uuid FK → customers | — |
| `date` | date | Data do agendamento |
| `frequency` | text | `semanal` · `quinzenal` · `mensal` |
| `status` | text | `agendado` · `concluido` · `atrasado` |
| `notes` | text | Observações |

---

### `services`
Serviços realizados.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` / `workspace_id` | uuid | Dono |
| `customer_id` | uuid FK → customers | — |
| `schedule_id` | uuid FK → schedules | Agendamento de origem (opcional) |
| `date` | date | Data do serviço |
| `notes` | text | Observações |
| `products_used` | text | Produtos utilizados |
| `photo_url` | text | URL de foto |

---

### `payments`
Pagamentos vinculados a serviços.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `user_id` / `workspace_id` | uuid | Dono |
| `service_id` | uuid FK → services | — |
| `amount` | decimal(10,2) | Valor |
| `status` | text | `pago` · `pendente` |
| `paid_at` | timestamptz | Data do pagamento |

---

### `audit_logs`
Log imutável de todas as ações.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | uuid PK | — |
| `workspace_id` | uuid FK | Tenant |
| `user_id` | uuid | Quem fez a ação |
| `action` | text | `create` · `update` · `delete` · `invite` · `role_change` |
| `resource_type` | text | `customer` · `schedule` · `service` · `payment` · `member` |
| `resource_id` | uuid | ID do recurso afetado |
| `old_data` | jsonb | Estado anterior (para updates/deletes) |
| `new_data` | jsonb | Estado novo (para creates/updates) |
| `metadata` | jsonb | Dados extras (IP, user agent…) |
| `created_at` | timestamptz | Timestamp imutável |

---

## Row Level Security

Todas as tabelas têm RLS. Padrão:
- **Leitura:** qualquer membro do workspace
- **Escrita:** qualquer membro (create), admins (delete)
- **Configurações:** apenas admins

A tabela `audit_logs` é somente insert/select — nunca update/delete.

As APIs do super admin (`/api/super-admin/`) usam o **service role key** (bypass total de RLS) exclusivamente server-side.

---

## Funções RPC

### `create_workspace(p_name, p_slug, p_admin_name, p_admin_email, p_admin_whatsapp)`
Cria workspace + membro admin + assinatura no plano Gratuito em uma única transação.
Usa `SECURITY DEFINER` para contornar RLS na criação inicial.

---

## Índices

```sql
-- Performance de queries por workspace
idx_customers_workspace_id
idx_schedules_workspace_id
idx_schedules_date
idx_services_workspace_id
idx_payments_workspace_id

-- Membership lookups
idx_workspace_members_workspace_id
idx_workspace_members_user_id

-- Audit
idx_audit_logs_workspace_id
idx_audit_logs_created_at (DESC)

-- Super admin (v3)
idx_workspaces_slug
idx_workspaces_is_blocked
```
