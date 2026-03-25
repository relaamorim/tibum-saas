'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ============================================
// Página exibida quando a empresa do usuário
// está com o acesso bloqueado pelo super admin
// ============================================

function BloqueadoContent() {
  const params = useSearchParams()
  const empresa = params.get('empresa') ?? 'sua empresa'
  const motivo = params.get('motivo')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏊</span>
          </div>
          <h1 className="text-xl font-bold text-white">TiBum</h1>
          <p className="text-gray-500 text-sm">Gestão de Piscinas</p>
        </div>

        {/* Card de bloqueio */}
        <div className="bg-gray-900 border border-red-800/60 rounded-2xl p-8 text-center shadow-2xl">
          {/* Ícone */}
          <div className="w-16 h-16 bg-red-900/40 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-red-800">
            <span className="text-3xl">🔒</span>
          </div>

          <h2 className="text-xl font-bold text-red-400 mb-2">
            Acesso Bloqueado
          </h2>

          <p className="text-gray-400 mb-1">
            O acesso de <strong className="text-white">{empresa}</strong> ao TiBum
            foi temporariamente suspenso.
          </p>

          {/* Motivo, se fornecido */}
          {motivo && (
            <div className="mt-4 bg-gray-800 rounded-xl p-4 text-left border border-gray-700">
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Motivo</p>
              <p className="text-sm text-gray-300">{motivo}</p>
            </div>
          )}

          {/* Instruções de contato */}
          <div className="mt-6 bg-gray-800/50 rounded-xl p-4 text-left border border-gray-800">
            <p className="text-sm font-medium text-white mb-2">O que fazer?</p>
            <p className="text-sm text-gray-400">
              Entre em contato com o suporte do TiBum para regularizar
              sua conta e restabelecer o acesso ao sistema.
            </p>
          </div>

          {/* Botão de sair */}
          <button
            onClick={handleLogout}
            className="mt-6 w-full px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300
              rounded-xl text-sm font-medium transition-colors"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  )
}

export default function BloqueadoPage() {
  return (
    // Suspense necessário porque useSearchParams() precisa de boundary
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BloqueadoContent />
    </Suspense>
  )
}
