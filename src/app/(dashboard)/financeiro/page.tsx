'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getPayments, markAsPaid, getFinancialSummary } from '@/services/payments'
import { useWorkspace } from '@/components/workspace-provider'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Payment, PaymentStatus } from '@/types/database'

const statusColors: Record<PaymentStatus, 'green' | 'yellow'> = {
  pago: 'green',
  pendente: 'yellow',
}

const statusLabels: Record<PaymentStatus, string> = {
  pago: 'Pago',
  pendente: 'Pendente',
}

export default function FinanceiroPage() {
  const supabase = createClient()
  const { workspace, loading: wsLoading } = useWorkspace()
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState({ received: 0, pending: 0 })
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wsLoading) loadData()
  }, [workspace, wsLoading, filterStatus])

  async function loadData() {
    try {
      const [paymentsData, summaryData] = await Promise.all([
        getPayments(supabase, filterStatus ? { status: filterStatus } : undefined, workspace?.id),
        getFinancialSummary(supabase, workspace?.id),
      ])
      setPayments(paymentsData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Erro ao carregar financeiro:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid(id: string) {
    try {
      await markAsPaid(supabase, id, workspace?.id)
      loadData()
    } catch (err) {
      console.error('Erro ao marcar como pago:', err)
    }
  }

  function getCustomerName(payment: Payment): string {
    const service = payment.service as any
    return service?.customer?.name || 'Cliente'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card title="Total Recebido" value={`R$ ${summary.received.toFixed(2)}`} className="border-l-4 border-l-emerald-500" />
        <Card title="Valores Pendentes" value={`R$ ${summary.pending.toFixed(2)}`} className="border-l-4 border-l-amber-500" />
        <Card title="Total Geral" value={`R$ ${(summary.received + summary.pending).toFixed(2)}`} className="border-l-4 border-l-cyan-500" />
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {['', 'pendente', 'pago'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filterStatus === s ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s === '' ? 'Todos' : statusLabels[s as PaymentStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : payments.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum pagamento encontrado.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Cliente</th>
                  <th className="text-left px-6 py-3 font-medium">Valor</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Data</th>
                  <th className="text-right px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{getCustomerName(p)}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">R$ {Number(p.amount).toFixed(2)}</td>
                    <td className="px-6 py-4"><Badge color={statusColors[p.status]}>{statusLabels[p.status]}</Badge></td>
                    <td className="px-6 py-4 text-gray-500 hidden sm:table-cell">
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleDateString('pt-BR')
                        : new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'pendente' && (
                        <Button size="sm" onClick={() => handleMarkPaid(p.id)}>Marcar Pago</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
