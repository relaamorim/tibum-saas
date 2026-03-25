import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Middleware para renovar sessão e proteger rotas
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Rotas públicas que não precisam de autenticação
  const publicPaths = ['/login', '/auth']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  // Não autenticado → redireciona para login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Autenticado na página de login → redireciona para dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Usuário autenticado fora do onboarding → verifica se tem workspace
  if (user && !isPublic && pathname !== '/onboarding') {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id, role')
      .eq('user_id', user.id)
      .single()

    // Sem workspace → manda para onboarding
    if (!member) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }

    // Rotas de configuração → apenas admins
    if (pathname.startsWith('/configuracoes') && member.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Onboarding com workspace existente → manda para dashboard
  if (user && pathname === '/onboarding') {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (member) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
