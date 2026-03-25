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
  const publicPaths = ['/login', '/auth', '/bloqueado']
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

  // Rota /super-admin: apenas o super admin pode acessar
  // (o layout também verifica server-side — dupla proteção)
  if (pathname.startsWith('/super-admin')) {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
    if (!user || user.email !== superAdminEmail) {
      const url = request.nextUrl.clone()
      url.pathname = user ? '/dashboard' : '/login'
      return NextResponse.redirect(url)
    }
  }

  // Verificação de workspace é feita no cliente (WorkspaceProvider)
  // para evitar problemas de RLS no Edge Runtime

  return supabaseResponse
}
