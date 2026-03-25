import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================
// POST /api/workspace/members
// Convida um novo membro para o workspace por email
// O sistema cria a conta Supabase e envia email de acesso
// ============================================

export async function POST(request: NextRequest) {
  // 1. Verifica autenticação do usuário que está convidando
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const body = await request.json()
  const { name, email, role, workspace_id } = body as {
    name: string
    email: string
    role: 'admin' | 'technician'
    workspace_id: string
  }

  // Validações básicas
  if (!name?.trim() || !email?.trim() || !workspace_id) {
    return NextResponse.json({ error: 'Nome, email e workspace são obrigatórios' }, { status: 400 })
  }

  if (!['admin', 'technician'].includes(role)) {
    return NextResponse.json({ error: 'Função inválida' }, { status: 400 })
  }

  // 2. Verifica se o usuário que está convidando é admin deste workspace
  const { data: callerMember } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!callerMember || callerMember.role !== 'admin') {
    return NextResponse.json({ error: 'Apenas admins podem convidar membros' }, { status: 403 })
  }

  const admin = createAdminClient()

  // 3. Convida o usuário por email (cria conta se não existir)
  // O Supabase envia um email com link de acesso automático
  const origin = request.headers.get('origin') || 'https://tibum-saas.vercel.app'

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email.trim().toLowerCase(),
    {
      data: { name: name.trim() },
      redirectTo: `${origin}/dashboard`,
    }
  )

  if (inviteError) {
    // Se o usuário já existe no Supabase, tenta buscar pelo email
    if (inviteError.message?.toLowerCase().includes('already been registered') ||
        inviteError.message?.toLowerCase().includes('already registered') ||
        inviteError.code === '422') {
      // Busca o usuário existente pelo email na lista de usuários
      const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existingUser = users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

      if (!existingUser) {
        return NextResponse.json({ error: 'Email já cadastrado mas usuário não encontrado. Tente novamente.' }, { status: 400 })
      }

      // Adiciona o usuário existente ao workspace
      const { data: member, error: memberError } = await admin
        .from('workspace_members')
        .insert({
          workspace_id,
          user_id: existingUser.id,
          role,
          invited_by: user.id,
          name: name.trim(),
        })
        .select()
        .single()

      if (memberError) {
        if (memberError.message?.includes('unique') || memberError.code === '23505') {
          return NextResponse.json({ error: 'Este usuário já é membro do workspace.' }, { status: 409 })
        }
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }

      return NextResponse.json({ member, already_existed: true })
    }

    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  // 4. Adiciona o novo usuário ao workspace
  const { data: member, error: memberError } = await admin
    .from('workspace_members')
    .insert({
      workspace_id,
      user_id: inviteData.user.id,
      role,
      invited_by: user.id,
      name: name.trim(),
    })
    .select()
    .single()

  if (memberError) {
    if (memberError.message?.includes('unique') || memberError.code === '23505') {
      return NextResponse.json({ error: 'Este usuário já é membro do workspace.' }, { status: 409 })
    }
    return NextResponse.json({ error: memberError.message }, { status: 500 })
  }

  return NextResponse.json({ member })
}
