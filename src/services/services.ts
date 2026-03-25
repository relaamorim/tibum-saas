import { SupabaseClient } from '@supabase/supabase-js'
import type { Service, ServiceForm } from '@/types/database'
import { logAudit } from './audit'

export async function getServices(supabase: SupabaseClient, workspaceId?: string) {
  let query = supabase
    .from('services')
    .select('*, customer:customers(id, name)')
    .order('date', { ascending: false })

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Service[]
}

export async function createService(
  supabase: SupabaseClient,
  form: ServiceForm,
  workspaceId?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('services')
    .insert({ ...form, user_id: user!.id, workspace_id: workspaceId ?? null })
    .select('*, customer:customers(id, name)')
    .single()
  if (error) throw error

  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'create',
      resourceType: 'service',
      resourceId: data.id,
      newData: { customer_id: form.customer_id, date: form.date },
    })
  }

  return data as Service
}

export async function updateService(
  supabase: SupabaseClient,
  id: string,
  form: Partial<ServiceForm>,
  workspaceId?: string
) {
  const { data, error } = await supabase
    .from('services')
    .update(form)
    .eq('id', id)
    .select('*, customer:customers(id, name)')
    .single()
  if (error) throw error

  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'update',
      resourceType: 'service',
      resourceId: id,
      newData: form as Record<string, unknown>,
    })
  }

  return data as Service
}

export async function deleteService(
  supabase: SupabaseClient,
  id: string,
  workspaceId?: string
) {
  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'delete',
      resourceType: 'service',
      resourceId: id,
    })
  }

  const { error } = await supabase.from('services').delete().eq('id', id)
  if (error) throw error
}
