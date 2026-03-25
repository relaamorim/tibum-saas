import { SupabaseClient } from '@supabase/supabase-js'
import type { Workspace, WorkspaceMember, Plan, Subscription, WorkspaceRole } from '@/types/database'

// ── Workspace ──────────────────────────────────────────────

// Busca o workspace (e role) do usuário logado
export async function getUserWorkspace(supabase: SupabaseClient): Promise<{
  workspace: Workspace
  role: WorkspaceRole
  subscription: Subscription | null
  plan: Plan | null
} | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces(id, name, slug, created_at, updated_at)')
    .eq('user_id', user.id)
    .single()

  if (!member || !member.workspace) return null

  // Supabase retorna o join como objeto (single join via .single())
  const workspace = member.workspace as unknown as Workspace

  // Busca a assinatura com o plano
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('workspace_id', workspace.id)
    .single()

  return {
    workspace,
    role: member.role as WorkspaceRole,
    subscription: subscription || null,
    plan: subscription?.plan || null,
  }
}

// Cria um workspace e define o usuário como admin
export async function createWorkspace(
  supabase: SupabaseClient,
  name: string,
  slug: string
): Promise<Workspace> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Cria o workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .insert({ name, slug })
    .select()
    .single()
  if (wsError) throw wsError

  // Adiciona o criador como admin
  const { error: memberError } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspace.id, user_id: user.id, role: 'admin' })
  if (memberError) throw memberError

  // Busca o plano gratuito para associar
  const { data: freePlan } = await supabase
    .from('plans')
    .select('id')
    .eq('name', 'Gratuito')
    .single()

  // Cria assinatura em trial (14 dias)
  if (freePlan) {
    await supabase.from('subscriptions').insert({
      workspace_id: workspace.id,
      plan_id: freePlan.id,
      status: 'trialing',
    })
  }

  return workspace
}

export async function updateWorkspace(
  supabase: SupabaseClient,
  id: string,
  data: Partial<Pick<Workspace, 'name' | 'slug'>>
): Promise<Workspace> {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return workspace
}

// ── Membros ────────────────────────────────────────────────

export async function getWorkspaceMembers(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at')
  if (error) throw error
  return data as WorkspaceMember[]
}

export async function inviteMember(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
  role: WorkspaceRole = 'technician'
): Promise<WorkspaceMember> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: workspaceId, user_id: userId, role, invited_by: user!.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMemberRole(
  supabase: SupabaseClient,
  memberId: string,
  role: WorkspaceRole
): Promise<WorkspaceMember> {
  const { data, error } = await supabase
    .from('workspace_members')
    .update({ role })
    .eq('id', memberId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', memberId)
  if (error) throw error
}

// ── Planos ─────────────────────────────────────────────────

export async function getPlans(supabase: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly')
  if (error) throw error
  return data as Plan[]
}

// Verifica se o workspace pode adicionar mais clientes (limite do plano)
export async function checkCustomerLimit(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const { count } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan:plans(max_customers)')
    .eq('workspace_id', workspaceId)
    .single()

  const maxCustomers = (sub?.plan as any)?.max_customers ?? null
  const current = count || 0

  return {
    allowed: maxCustomers === null || current < maxCustomers,
    current,
    max: maxCustomers,
  }
}

// Verifica limite de membros do workspace
export async function checkMemberLimit(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<{ allowed: boolean; current: number; max: number | null }> {
  const { count } = await supabase
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan:plans(max_members)')
    .eq('workspace_id', workspaceId)
    .single()

  const maxMembers = (sub?.plan as any)?.max_members ?? null
  const current = count || 0

  return {
    allowed: maxMembers === null || current < maxMembers,
    current,
    max: maxMembers,
  }
}
