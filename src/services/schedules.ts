import { SupabaseClient } from '@supabase/supabase-js'
import type { Schedule, ScheduleForm } from '@/types/database'
import { logAudit } from './audit'

export async function getSchedules(
  supabase: SupabaseClient,
  filters?: { status?: string },
  workspaceId?: string
) {
  let query = supabase
    .from('schedules')
    .select('*, customer:customers(id, name, phone)')
    .order('date', { ascending: true })

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }

  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw error
  return data as Schedule[]
}

export async function getUpcomingSchedules(
  supabase: SupabaseClient,
  limit = 5,
  workspaceId?: string
) {
  const today = new Date().toISOString().split('T')[0]
  let query = supabase
    .from('schedules')
    .select('*, customer:customers(id, name, phone)')
    .gte('date', today)
    .eq('status', 'agendado')
    .order('date', { ascending: true })
    .limit(limit)

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Schedule[]
}

export async function createSchedule(
  supabase: SupabaseClient,
  form: ScheduleForm,
  workspaceId?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('schedules')
    .insert({ ...form, user_id: user!.id, workspace_id: workspaceId ?? null })
    .select('*, customer:customers(id, name, phone)')
    .single()
  if (error) throw error

  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'create',
      resourceType: 'schedule',
      resourceId: data.id,
      newData: { customer_id: form.customer_id, date: form.date, frequency: form.frequency },
    })
  }

  return data as Schedule
}

export async function updateSchedule(
  supabase: SupabaseClient,
  id: string,
  form: Partial<ScheduleForm>,
  workspaceId?: string
) {
  const { data, error } = await supabase
    .from('schedules')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, customer:customers(id, name, phone)')
    .single()
  if (error) throw error

  if (workspaceId && form.status) {
    await logAudit(supabase, {
      workspaceId,
      action: 'update',
      resourceType: 'schedule',
      resourceId: id,
      newData: { status: form.status },
    })
  }

  return data as Schedule
}

export async function deleteSchedule(
  supabase: SupabaseClient,
  id: string,
  workspaceId?: string
) {
  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'delete',
      resourceType: 'schedule',
      resourceId: id,
    })
  }

  const { error } = await supabase.from('schedules').delete().eq('id', id)
  if (error) throw error
}
