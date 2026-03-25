'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useWorkspace } from '@/components/workspace-provider'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Schedule } from '@/types/database'

export default function DashboardPage() {
  const supabase = createClient()
  const { workspace, loading: wsLoading } = useWorkspace()
  const [stats, setStats] = useState({ customers: 0, todaySchedules: 0, monthServices: 0, pendingAmount: 0 })
  const [upcoming, setUpcoming] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wsLoading) loadDashboard()
  }, [workspace, wsLoading])

  async function loadDashboard() {
    try {
      const today = new Date().toISOString().split('T')[0]
      const monthStart = today.slice(0, 7) + '-01'
      const wid = workspace?.id

      // Base dos filtros: workspace (multi-tenant) ou user_id (legado)
      const { data: { user } } = await supabase.auth.getUser()
      const workspaceFilter = wid
        ? (q: any) => q.eq('workspace_id', wid)
        : (q: any) => q.eq('user_id', user?.id)

      const [customersRes, todayRes, servicesRes, paymentsRes, upcomingRes] = await Promise.all([
        workspaceFilter(supabase.from('customers').select('id', { count: 'exact', head: true })),
        workspaceFilter(supabase.from('schedules').select('id', { count: 'exact', head: true }))
          .eq('date', today).eq('status', 'agendado'),
        workspaceFilter(supabase.from('services').select('id', { count: 'exact', head: true }))
          .gte('date', monthStart),
        workspaceFilter(supabase.from('payments').select('amount')).eq('status', 'pendente'),
        workspaceFilter(supabase.from('schedules')
          .select('*, customer:customers(id, name, phone)'))
          .gte('date', today).eq('status', 'agendado').order('date').limit(5),
      ])

      const pendingTotal = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)

      setStats({
        customers: customersRes.count || 0,
        todaySchedules: todayRes.count || 0,
        monthServices: servicesRes.count || 0,
        pendingAmount: pendingTotal,
      })
      setUpcoming(upcomingRes.data || [])
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (wsLoading || loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Total de Clientes" value={stats.customers} subtitle="cadastrados" />
        <Card title="Agendamentos Hoje" value={stats.todaySchedules} subtitle="para hoje" />
        <Card title="Serviços no Mês" value={stats.monthServices} subtitle="realizados" />
        <Card
          title="Valores Pendentes"
          value={`R$ ${stats.pendingAmount.toFixed(2)}`}
          subtitle="a receber"
        />
      </div>

      {/* Próximos agendamentos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Próximos Agendamentos</h2>
        </div>
        {upcoming.length === 0 ? (
          <p className="px-6 py-8 text-gray-500 text-center">Nenhum agendamento próximo.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcoming.map((s) => (
              <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.customer?.name}</p>
                  <p className="text-sm text-gray-500">{s.customer?.phone || 'Sem telefone'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                  <Badge color="blue">{s.frequency}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
