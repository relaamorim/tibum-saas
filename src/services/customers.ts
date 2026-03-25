import { SupabaseClient } from '@supabase/supabase-js'
import type { Customer, CustomerForm } from '@/types/database'
import { logAudit } from './audit'

// CRUD de clientes (com suporte a workspace_id e audit logs)

export async function getCustomers(supabase: SupabaseClient, workspaceId?: string) {
  let query = supabase.from('customers').select('*').order('name')

  if (workspaceId) {
    // Filtra pelo workspace (multi-tenant)
    query = query.eq('workspace_id', workspaceId)
  } else {
    // Fallback para dados legados (filtra pelo user_id)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Customer[]
}

export async function getCustomer(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as Customer
}

export async function createCustomer(
  supabase: SupabaseClient,
  form: CustomerForm,
  workspaceId?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...form, user_id: user!.id, workspace_id: workspaceId ?? null })
    .select()
    .single()
  if (error) throw error

  // Registra no log de auditoria
  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'create',
      resourceType: 'customer',
      resourceId: data.id,
      newData: { name: data.name, phone: data.phone },
    })
  }

  return data as Customer
}

export async function updateCustomer(
  supabase: SupabaseClient,
  id: string,
  form: Partial<CustomerForm>,
  workspaceId?: string
) {
  // Captura estado anterior para o audit log
  let oldData: Partial<Customer> | undefined
  if (workspaceId) {
    const current = await getCustomer(supabase, id)
    oldData = { name: current.name, phone: current.phone }
  }

  const { data, error } = await supabase
    .from('customers')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'update',
      resourceType: 'customer',
      resourceId: id,
      oldData: oldData as Record<string, unknown>,
      newData: { name: data.name, phone: data.phone },
    })
  }

  return data as Customer
}

export async function deleteCustomer(
  supabase: SupabaseClient,
  id: string,
  workspaceId?: string
) {
  if (workspaceId) {
    const current = await getCustomer(supabase, id)
    await logAudit(supabase, {
      workspaceId,
      action: 'delete',
      resourceType: 'customer',
      resourceId: id,
      oldData: { name: current.name, phone: current.phone },
    })
  }

  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
}
