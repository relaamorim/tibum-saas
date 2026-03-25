'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getServices, createService, deleteService } from '@/services/services'
import { getCustomers } from '@/services/customers'
import { createPayment } from '@/services/payments'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import type { Service, Customer } from '@/types/database'

export default function ServicosPage() {
  const supabase = createClient()
  const { workspace, isAdmin, loading: wsLoading } = useWorkspace()
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    products_used: '',
    photo_url: '',
    amount: '',
  })

  useEffect(() => {
    if (!wsLoading) loadData()
  }, [workspace, wsLoading])

  async function loadData() {
    try {
      const [servicesData, customersData] = await Promise.all([
        getServices(supabase, workspace?.id),
        getCustomers(supabase, workspace?.id),
      ])
      setServices(servicesData)
      setCustomers(customersData)
    } catch (err) {
      console.error('Erro ao carregar serviços:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const service = await createService(supabase, {
        customer_id: form.customer_id,
        date: form.date,
        notes: form.notes || null,
        products_used: form.products_used || null,
        photo_url: form.photo_url || null,
        schedule_id: null,
      }, workspace?.id)

      if (form.amount && Number(form.amount) > 0) {
        await createPayment(supabase, {
          service_id: service.id,
          amount: Number(form.amount),
          status: 'pendente',
          paid_at: null,
        }, workspace?.id)
      }

      setModalOpen(false)
      loadData()
    } catch (err) {
      console.error('Erro ao salvar serviço:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este registro de serviço?')) return
    try {
      await deleteService(supabase, id, workspace?.id)
      setServices(services.filter((s) => s.id !== id))
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
        <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
        <Button onClick={() => {
          setForm({ customer_id: '', date: new Date().toISOString().split('T')[0], notes: '', products_used: '', photo_url: '', amount: '' })
          setModalOpen(true)
        }}>+ Registrar Serviço</Button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : services.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum serviço registrado.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Cliente</th>
                  <th className="text-left px-6 py-3 font-medium">Data</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Observações</th>
                  <th className="text-left px-6 py-3 font-medium hidden lg:table-cell">Produtos</th>
                  <th className="text-right px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.customer?.name}</td>
                    <td className="px-6 py-4 text-gray-700">
                      {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden md:table-cell max-w-xs truncate">{s.notes || '-'}</td>
                    <td className="px-6 py-4 text-gray-500 hidden lg:table-cell max-w-xs truncate">{s.products_used || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Excluir</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Registrar Serviço">
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Cliente *" options={customerOptions} value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })} required />
          <Input label="Data *" type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Input label="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Input label="Produtos Utilizados" value={form.products_used}
            onChange={(e) => setForm({ ...form, products_used: e.target.value })} placeholder="Ex: cloro, algicida, barrilha" />
          <Input label="URL da Foto (opcional)" value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="https://..." />
          <Input label="Valor do Serviço (R$)" type="number" step="0.01" min="0"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
