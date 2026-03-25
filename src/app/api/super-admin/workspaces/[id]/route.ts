import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================
// PATCH /api/super-admin/workspaces/[id]
// Bloqueia ou desbloqueia um workspace
// Body: { action: 'block' | 'unblock', reason?: string }
//
// DELETE /api/super-admin/workspaces/[id]
// Exclui workspace permanentemente (cascade: membros, clientes, etc.)
// O slug é liberado para que outra empresa possa se cadastrar futuramente
// ============================================

// Verifica se o usuário é super admin — reutilizado nas duas rotas
async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { user: null, error: 'Não autenticado', status: 401 }
  if (user.email !== process.env.SUPER_ADMIN_EMAIL) return { user: null, error: 'Acesso negado', status: 403 }

  return { user, error: null, status: 200 }
}

// ── PATCH: bloquear / desbloquear ──────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status } = await assertSuperAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const body = await request.json()
  const { action, reason, plan_id } = body as {
    action: 'block' | 'unblock' | 'set_plan'
    reason?: string
    plan_id?: string
  }

  if (!['block', 'unblock', 'set_plan'].includes(action)) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── Ação: alterar plano manualmente ────────────────────────
  if (action === 'set_plan') {
    if (!plan_id) {
      return NextResponse.json({ error: 'plan_id é obrigatório' }, { status: 400 })
    }

    // Verifica se o plano existe
    const { data: plan, error: planError } = await admin
      .from('plans')
      .select('id, name')
      .eq('id', plan_id)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 })
    }

    // Atualiza a assinatura existente ou cria uma nova se não existir
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('workspace_id', id)
      .single()

    if (existingSub) {
      const { error: updateError } = await admin
        .from('subscriptions')
        .update({ plan_id, status: 'active' })
        .eq('workspace_id', id)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // Workspace sem assinatura — cria uma nova
      const { error: insertError } = await admin
        .from('subscriptions')
        .insert({ workspace_id: id, plan_id, status: 'active' })

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, plan_name: plan.name })
  }

  // ── Ação: bloquear / desbloquear ───────────────────────────
  const updateData =
    action === 'block'
      ? { is_blocked: true, blocked_at: new Date().toISOString(), blocked_reason: reason ?? null }
      : { is_blocked: false, blocked_at: null, blocked_reason: null }

  const { data, error: dbError } = await admin
    .from('workspaces')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ workspace: data })
}

// ── DELETE: excluir workspace permanentemente ──────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status } = await assertSuperAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const admin = createAdminClient()

  // Busca o nome do workspace antes de excluir (para o log de confirmação)
  const { data: ws } = await admin
    .from('workspaces')
    .select('name, slug')
    .eq('id', id)
    .single()

  if (!ws) {
    return NextResponse.json({ error: 'Workspace não encontrado' }, { status: 404 })
  }

  // Exclui o workspace — o CASCADE no banco apaga automaticamente:
  // workspace_members, subscriptions, audit_logs,
  // customers, schedules, services, payments
  // O slug fica livre para reutilização por outras empresas
  const { error: deleteError } = await admin
    .from('workspaces')
    .delete()
    .eq('id', id)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Workspace "${ws.name}" (slug: ${ws.slug}) excluído. O slug está disponível para nova empresa.`,
  })
}
