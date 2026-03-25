'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from './workspace-provider'
import { Badge } from './ui/badge'

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const { subscription } = useWorkspace()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Determina se a assinatura está em status de atenção
  const isTrialing = subscription?.status === 'trialing'
  const isPastDue = subscription?.status === 'past_due'

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
      {/* Espaço para o botão hamburguer no mobile */}
      <div className="lg:hidden w-10" />

      {/* Banner de status da assinatura */}
      <div className="flex-1">
        {isTrialing && (
          <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1.5 rounded-lg">
            <span>⏳</span>
            <span>Trial ativo — veja os planos para continuar após o período gratuito.</span>
            <a href="/configuracoes/plano" className="font-semibold underline">
              Ver planos
            </a>
          </div>
        )}
        {isPastDue && (
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-1.5 rounded-lg">
            <span>⚠️</span>
            <span>Pagamento pendente — atualize seu plano para manter o acesso.</span>
            <a href="/configuracoes/plano" className="font-semibold underline">
              Atualizar
            </a>
          </div>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap"
      >
        Sair
      </button>
    </header>
  )
}
