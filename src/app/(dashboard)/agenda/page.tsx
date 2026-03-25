'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '@/services/schedules'
import { getCustomers } from '@/services/customers'
import { createService } from '@/services/services'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import type { Schedule, Customer, ScheduleStatus, Frequency } from '@/types/database'

const statusColors: Record<ScheduleStatus, 'blue' | 'green' | 'red'> = {
  agendado: 'blue',
  concluido: 'green',
  atrasado: 'red',
}

const statusLabels: Record<ScheduleStatus, string> = {
  agendado: 'Agendado',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
}

const frequencyLabels: Record<Frequency, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
}

export default function AgendaPage() {
  const supabase = createClient()
  const { workspace, isAdmin, loading: wsLoading } = useWorkspace()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filterStatus, setFilterStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    date: '',
    frequency: 'semanal' as Frequency,
    status: 'agendado' as ScheduleStatus,
    notes: '',
  })

  useEffect(() => {
    if (!wsLoading) loadData()
  }, [workspace, wsLoading, filterStatus])

  async function loadData() {
    try {
      const [schedulesData, customersData] = await Promise.all([
        getSchedules(supabase, filterStatus ? { status: filterStatus } : undefined, workspace?.id),
        getCustomers(supabase, workspace?.id),
      ])
      setSchedules(schedulesData)
      setCustomers(customersData)
    } catch (err) {
      console.error('Erro ao carregar agenda:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createSchedule(supabase, {
        customer_id: form.customer_id,
        date: form.date,
        frequency: form.frequency,
        status: form.status,
        notes: form.notes || null,
      }, workspace?.id)
      setModalOpen(false)
      loadData()
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleComplete(schedule: Schedule) {
    try {
      await updateSchedule(supabase, schedule.id, { status: 'concluido' }, workspace?.id)
      await createService(supabase, {
        customer_id: schedule.customer_id,
        schedule_id: schedule.id,
        date: new Date().toISOString().split('T')[0],
        notes: `Serviço concluído - agendamento ${schedule.date}`,
        products_used: null,
        photo_url: null,
      }, workspace?.id)
      loadData()
    } catch (err) {
      console.error('Erro ao concluir:', err)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este agendamento?')) return
    try {
      await deleteSchedule(supabase, id, workspace?.id)
      setSchedules(schedules.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  const customerOptions = [
    { value: '', label: 'Selecione o cliente...' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <Button onClick={() => {
          setForm({ customer_id: '', date: '', frequency: 'semanal', status: 'agendado', notes: '' })
          setModalOpen(true)
        }}>+ Novo Agendamento</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'agendado', 'concluido', 'atrasado'].map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filterStatus === s ? 'bg-cyan-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
          >
            {s === '' ? 'Todos' : statusLabels[s as ScheduleStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : schedules.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum agendamento encontrado.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Cliente</th>
                  <th className="text-left px-6 py-3 font-medium">Data</th>
                  <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Frequência</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-right px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.customer?.name}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <Badge color="gray">{frequencyLabels[s.frequency]}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {s.status === 'agendado' && (
                        <Button variant="ghost" size="sm" onClick={() => handleComplete(s)}>
                          Concluir
                        </Button>
                      )}
                      {isAdmin && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>
                          Excluir
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Agendamento">
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Cliente *" options={customerOptions} value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required />
          <Input label="Data *" type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Select label="Frequência" options={[
            { value: 'semanal', label: 'Semanal' },
            { value: 'quinzenal', label: 'Quinzenal' },
            { value: 'mensal', label: 'Mensal' },
          ]} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })} />
          <Input label="Observações" value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Criar Agendamento'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
