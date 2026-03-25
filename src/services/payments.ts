import { SupabaseClient } from '@supabase/supabase-js'
import type { Payment, PaymentForm } from '@/types/database'
import { logAudit } from './audit'

export async function getPayments(
  supabase: SupabaseClient,
  filters?: { status?: string },
  workspaceId?: string
) {
  let query = supabase
    .from('payments')
    .select('*, service:services(id, date, customer:customers(id, name))')
    .order('created_at', { ascending: false })

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }

  if (filters?.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw error
  return data as Payment[]
}

export async function createPayment(
  supabase: SupabaseClient,
  form: PaymentForm,
  workspaceId?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...form, user_id: user!.id, workspace_id: workspaceId ?? null })
    .select('*, service:services(id, date, customer:customers(id, name))')
    .single()
  if (error) throw error

  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'create',
      resourceType: 'payment',
      resourceId: data.id,
      newData: { amount: form.amount, status: form.status },
    })
  }

  return data as Payment
}

export async function markAsPaid(
  supabase: SupabaseClient,
  id: string,
  workspaceId?: string
) {
  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'pago', paid_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  if (workspaceId) {
    await logAudit(supabase, {
      workspaceId,
      action: 'update',
      resourceType: 'payment',
      resourceId: id,
      newData: { status: 'pago' },
    })
  }

  return data as Payment
}

// Calcula totais financeiros do workspace
export async function getFinancialSummary(
  supabase: SupabaseClient,
  workspaceId?: string
) {
  let query = supabase.from('payments').select('amount, status')

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }

  const { data, error } = await query
  if (error) throw error

  const totals = (data || []).reduce(
    (acc, p) => {
      if (p.status === 'pago') acc.received += Number(p.amount)
      else acc.pending += Number(p.amount)
      return acc
    },
    { received: 0, pending: 0 }
  )

  return totals
}
