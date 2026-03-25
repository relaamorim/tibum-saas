'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPlans } from '@/services/workspaces'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Plan } from '@/types/database'

// Mapeia status de assinatura para exibição
const statusInfo: Record<string, { label: string; color: 'green' | 'yellow' | 'red' | 'gray' }> = {
  trialing: { label: 'Trial', color: 'yellow' },
  active: { label: 'Ativo', color: 'green' },
  canceled: { label: 'Cancelado', color: 'red' },
  past_due: { label: 'Pagamento Pendente', color: 'red' },
}

export default function PlanoPage() {
  const supabase = createClient()
  const { workspace, subscription, plan, loading } = useWorkspace()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    loadPlans()
  }, [])

  async function loadPlans() {
    try {
      const data = await getPlans(supabase)
      setPlans(data)
    } catch {
      console.error('Erro ao carregar planos')
    } finally {
      setLoadingPlans(false)
    }
  }

  // Simula contato para upgrade (futuro: integrar Stripe)
  function handleUpgrade(planName: string) {
    alert(`Para fazer upgrade para o plano "${planName}", entre em contato via WhatsApp ou email. Em breve a cobrança será automática!`)
  }

  const currentStatus = subscription ? statusInfo[subscription.status] : null

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Plano e Assinatura</h1>

      {/* Plano atual */}
      {!loading && subscription && plan && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Plano Atual</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-gray-900">{plan.name}</span>
                {currentStatus && (
                  <Badge color={currentStatus.color}>{currentStatus.label}</Badge>
                )}
              </div>
              <p className="text-3xl font-bold text-cyan-600">
                R$ {Number(plan.price_monthly).toFixed(2)}
                <span className="text-base font-normal text-gray-500">/mês</span>
              </p>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>
                Clientes: {plan.max_customers ? `até ${plan.max_customers}` : 'Ilimitado'}
              </p>
              <p>
                Membros: {plan.max_members ? `até ${plan.max_members}` : 'Ilimitado'}
              </p>
              {subscription.trial_ends_at && subscription.status === 'trialing' && (
                <p className="text-amber-600 font-medium">
                  Trial expira em: {new Date(subscription.trial_ends_at).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          {plan.features && Array.isArray(plan.features) && plan.features.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-600 mb-2">Incluso:</p>
              <ul className="space-y-1">
                {plan.features.map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="text-emerald-500">✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Todos os planos */}
      <h2 className="text-lg font-semibold text-gray-800">Todos os Planos</h2>
      {loadingPlans ? (
        <p className="text-gray-500">Carregando planos...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = p.id === plan?.id
            return (
              <div
                key={p.id}
                className={`bg-white rounded-xl border-2 shadow-sm p-6 flex flex-col
                  ${isCurrent ? 'border-cyan-500' : 'border-gray-200'}`}
              >
                {isCurrent && (
                  <span className="text-xs font-semibold text-cyan-600 mb-2">PLANO ATUAL</span>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-1">{p.name}</h3>
                <p className="text-3xl font-bold text-gray-900 mb-4">
                  R$ {Number(p.price_monthly).toFixed(2)}
                  <span className="text-sm font-normal text-gray-500">/mês</span>
                </p>
                <div className="text-sm text-gray-500 space-y-1 mb-4 flex-1">
                  <p>Clientes: {p.max_customers ?? 'Ilimitado'}</p>
                  <p>Membros: {p.max_members ?? 'Ilimitado'}</p>
                </div>
                {Array.isArray(p.features) && (
                  <ul className="space-y-1 mb-6">
                    {p.features.map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="text-emerald-500">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  variant={isCurrent ? 'secondary' : 'primary'}
                  disabled={isCurrent}
                  onClick={() => !isCurrent && handleUpgrade(p.name)}
                  className="w-full"
                >
                  {isCurrent ? 'Plano Atual' : 'Fazer Upgrade'}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Nota sobre faturamento */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
        <p>
          💳 <strong>Faturamento automático em breve.</strong> Por enquanto, entre em contato com nossa equipe para fazer upgrade ou cancelar seu plano.
        </p>
      </div>
    </div>
  )
}
