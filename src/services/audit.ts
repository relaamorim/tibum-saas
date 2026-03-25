import { SupabaseClient } from '@supabase/supabase-js'
import type { AuditAction, AuditLog } from '@/types/database'

// ──────────────────────────────────────────────────────────
// Serviço de auditoria — registra todas as ações relevantes
// ──────────────────────────────────────────────────────────

interface LogOptions {
  workspaceId: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

// Registra uma ação no log de auditoria
export async function logAudit(
  supabase: SupabaseClient,
  options: LogOptions
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()

  // Falha silenciosa — não interrompe o fluxo principal
  const { error } = await supabase.from('audit_logs').insert({
    workspace_id: options.workspaceId,
    user_id: user?.id ?? null,
    action: options.action,
    resource_type: options.resourceType,
    resource_id: options.resourceId ?? null,
    old_data: options.oldData ?? null,
    new_data: options.newData ?? null,
    metadata: options.metadata ?? null,
  })

  if (error) {
    // Apenas loga no console — não lança o erro
    console.warn('[Audit] Falha ao registrar log:', error.message)
  }
}

// Busca logs de auditoria do workspace (paginado)
export async function getAuditLogs(
  supabase: SupabaseClient,
  workspaceId: string,
  options?: {
    limit?: number
    offset?: number
    resourceType?: string
    action?: string
  }
): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50)

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1)
  }
  if (options?.resourceType) {
    query = query.eq('resource_type', options.resourceType)
  }
  if (options?.action) {
    query = query.eq('action', options.action)
  }

  const { data, error } = await query
  if (error) throw error
  return data as AuditLog[]
}

// Nomes amigáveis para exibição na UI
export const actionLabels: Record<AuditAction, string> = {
  create: 'Criou',
  update: 'Atualizou',
  delete: 'Excluiu',
  login: 'Fez login',
  logout: 'Fez logout',
  invite: 'Convidou membro',
  role_change: 'Alterou função',
}

export const resourceLabels: Record<string, string> = {
  customer: 'Cliente',
  schedule: 'Agendamento',
  service: 'Serviço',
  payment: 'Pagamento',
  workspace: 'Workspace',
  member: 'Membro',
}
