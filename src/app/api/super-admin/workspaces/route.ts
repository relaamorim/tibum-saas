import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { WorkspaceAdminView } from '@/types/database'

// ============================================
// GET /api/super-admin/workspaces
// Retorna todos os workspaces com plano, status e contadores
// Acesso exclusivo ao super admin do TiBum
// ============================================

export async function GET() {
  // 1. Verifica se o usuário logado é o super admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Compara o email com a variável de ambiente SUPER_ADMIN_EMAIL
  if (user.email !== process.env.SUPER_ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // 2. Usa o cliente admin (bypassa RLS) para buscar tudo
  const admin = createAdminClient()

  // Busca todos os workspaces com assinatura + plano + dados de contato do admin (v4)
  const { data: workspaces, error: wsError } = await admin
    .from('workspaces')
    .select('id, name, slug, is_blocked, blocked_at, blocked_reason, admin_email, admin_whatsapp, created_at, subscriptions(id, status, plan_id, plan:plans(id, name, price_monthly))')
    .order('created_at', { ascending: false })

  // Busca todos os planos disponíveis para o seletor de plano
  const { data: plans } = await admin
    .from('plans')
    .select('id, name, price_monthly')
    .eq('is_active', true)
    .order('price_monthly')

  if (wsError) {
    return NextResponse.json({ error: wsError.message }, { status: 500 })
  }

  // Busca todos os membros (para contar e para pegar o nome do admin)
  const { data: members } = await admin
    .from('workspace_members')
    .select('workspace_id, role, name')

  // Busca todos os clientes para contar por workspace
  const { data: customers } = await admin
    .from('customers')
    .select('workspace_id')
    .not('workspace_id', 'is', null)

  // Monta mapas de contagem e nome do admin por workspace
  const memberCountMap: Record<string, number> = {}
  const adminNameMap: Record<string, string | null> = {}
  for (const m of members ?? []) {
    memberCountMap[m.workspace_id] = (memberCountMap[m.workspace_id] || 0) + 1
    // O primeiro membro com role 'admin' e nome preenchido é o dono da empresa
    if (m.role === 'admin' && m.name && !adminNameMap[m.workspace_id]) {
      adminNameMap[m.workspace_id] = m.name
    }
  }

  const customerCountMap: Record<string, number> = {}
  for (const c of customers ?? []) {
    if (c.workspace_id) {
      customerCountMap[c.workspace_id] = (customerCountMap[c.workspace_id] || 0) + 1
    }
  }

  // Formata a resposta no formato WorkspaceAdminView
  const result: WorkspaceAdminView[] = (workspaces ?? []).map((ws: any) => {
    const sub = ws.subscriptions?.[0] ?? null
    const plan = sub?.plan ?? null
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      is_blocked: ws.is_blocked ?? false,
      blocked_at: ws.blocked_at ?? null,
      blocked_reason: ws.blocked_reason ?? null,
      created_at: ws.created_at,
      admin_name: adminNameMap[ws.id] ?? null,
      admin_email: ws.admin_email ?? null,
      admin_whatsapp: ws.admin_whatsapp ?? null,
      subscription_id: sub?.id ?? null,
      subscription_status: sub?.status ?? null,
      plan_id: sub?.plan_id ?? null,
      plan_name: plan?.name ?? null,
      plan_price: plan?.price_monthly ?? null,
      member_count: memberCountMap[ws.id] ?? 0,
      customer_count: customerCountMap[ws.id] ?? 0,
    }
  })

  // Estatísticas gerais para os cards do topo do painel
  const stats = {
    total: result.length,
    blocked: result.filter((w) => w.is_blocked).length,
    by_plan: result.reduce<Record<string, number>>((acc, w) => {
      const plan = w.plan_name ?? 'Sem plano'
      acc[plan] = (acc[plan] || 0) + 1
      return acc
    }, {}),
  }

  return NextResponse.json({ workspaces: result, stats, plans: plans ?? [] })
}
