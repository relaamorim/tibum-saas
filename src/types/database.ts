// ============================================
// TiBum SaaS - Tipos do banco de dados (v2 multi-tenant)
// ============================================

// ── Enums existentes ──────────────────────
export type PoolType = 'fibra' | 'vinil' | 'concreto'
export type Frequency = 'semanal' | 'quinzenal' | 'mensal'
export type ScheduleStatus = 'agendado' | 'concluido' | 'atrasado'
export type PaymentStatus = 'pago' | 'pendente'

// ── Novos enums (v2) ──────────────────────
export type WorkspaceRole = 'admin' | 'technician'
export type SubscriptionStatus = 'trialing' | 'active' | 'canceled' | 'past_due'
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'invite' | 'role_change'

// ── Tabelas existentes (agora com workspace_id) ──────
export interface Customer {
  id: string
  user_id: string
  workspace_id: string | null  // null = registro legado (pré-v2)
  name: string
  phone: string | null
  address: string | null
  pool_type: PoolType | null   // mantido para compatibilidade com registros antigos
  pool_size: string | null     // mantido para compatibilidade com registros antigos
  // Campos dinâmicos (v5) — pares chave/valor definidos pelo admin
  custom_fields: Record<string, string> | null
  // Fotos (v5) — array de URLs públicas do Supabase Storage
  photos: string[] | null
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  user_id: string
  workspace_id: string | null
  customer_id: string
  date: string
  frequency: Frequency
  status: ScheduleStatus
  notes: string | null
  created_at: string
  updated_at: string
  customer?: Pick<Customer, 'id' | 'name' | 'phone'>
}

export interface Service {
  id: string
  user_id: string
  workspace_id: string | null
  customer_id: string
  schedule_id: string | null
  date: string
  notes: string | null
  products_used: string | null
  photo_url: string | null
  created_at: string
  customer?: Pick<Customer, 'id' | 'name'>
  schedule?: Pick<Schedule, 'id' | 'date'>
}

export interface Payment {
  id: string
  user_id: string
  workspace_id: string | null
  service_id: string
  amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
  service?: Service & { customer?: Pick<Customer, 'id' | 'name'> }
}

// ── Novas tabelas (v2) ────────────────────
export interface Workspace {
  id: string
  name: string
  slug: string
  // Campos de bloqueio (v3 — gerenciados pelo super admin do TiBum)
  is_blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  // Dados de contato do administrador (v4)
  admin_email: string | null
  admin_whatsapp: string | null
  created_at: string
  updated_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  invited_by: string | null
  // Nome de exibição do membro (preenchido no onboarding para o admin)
  name: string | null
  created_at: string
  workspace?: Workspace
  // Email vem de auth.users (via join manual)
  email?: string
}

export interface Plan {
  id: string
  name: string
  price_monthly: number
  max_customers: number | null  // null = ilimitado
  max_members: number | null
  features: string[]
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  workspace_id: string
  plan_id: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  external_id: string | null
  created_at: string
  plan?: Plan
}

export interface AuditLog {
  id: string
  workspace_id: string
  user_id: string | null
  action: AuditAction
  resource_type: string
  resource_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  created_at: string
  // Campo virtual enriquecido
  user_email?: string
}

// ── Contexto de workspace (para uso nos componentes) ──
export interface WorkspaceContext {
  workspace: Workspace
  role: WorkspaceRole
  subscription: Subscription | null
  plan: Plan | null
  member: WorkspaceMember
}

// ── Tipos de formulário (sem campos automáticos) ──────
export type CustomerForm = Omit<Customer, 'id' | 'user_id' | 'workspace_id' | 'created_at' | 'updated_at'>
export type ScheduleForm = Omit<Schedule, 'id' | 'user_id' | 'workspace_id' | 'created_at' | 'updated_at' | 'customer'>
export type ServiceForm = Omit<Service, 'id' | 'user_id' | 'workspace_id' | 'created_at' | 'customer' | 'schedule'>
export type PaymentForm = Omit<Payment, 'id' | 'user_id' | 'workspace_id' | 'created_at' | 'service'>
export type WorkspaceForm = Pick<Workspace, 'name' | 'slug'>

// ── Tipo para o painel do super admin (v3/v4) ──
export interface WorkspaceAdminView {
  id: string
  name: string
  slug: string
  is_blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  created_at: string
  // Dados de contato do administrador (v4)
  admin_name: string | null
  admin_email: string | null
  admin_whatsapp: string | null
  // Dados de assinatura
  subscription_id: string | null
  subscription_status: string | null
  plan_id: string | null
  plan_name: string | null
  plan_price: number | null
  // Contadores
  member_count: number
  customer_count: number
}
