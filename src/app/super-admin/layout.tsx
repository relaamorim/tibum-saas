import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// ============================================
// Layout do painel de super admin
// Verificação de acesso no servidor — usuários comuns
// são redirecionados antes mesmo de carregar a página
// ============================================

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Não autenticado → login
  if (!user) redirect('/login')

  // Não é super admin → dashboard normal
  if (user.email !== process.env.SUPER_ADMIN_EMAIL) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Cabeçalho roxo para distinguir do dashboard normal */}
      <header className="bg-gradient-to-r from-violet-900 via-purple-900 to-indigo-900 border-b border-violet-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {/* Logo */}
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-violet-600">
            <span className="text-xl">🏊</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white leading-tight">TiBum — Painel do Criador</h1>
            <p className="text-xs text-violet-300">Gerenciamento de clientes e planos</p>
          </div>
          {/* Email do super admin */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs bg-violet-700/50 text-violet-200 px-3 py-1 rounded-full border border-violet-600">
              ⚡ Super Admin
            </span>
            <span className="text-sm text-violet-400 hidden sm:block">{user.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {children}
      </main>
    </div>
  )
}
