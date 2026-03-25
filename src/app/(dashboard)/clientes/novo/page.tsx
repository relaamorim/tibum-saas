'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createCustomer, getCustomer, updateCustomer } from '@/services/customers'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { PoolType } from '@/types/database'

const poolOptions = [
  { value: '', label: 'Selecione...' },
  { value: 'fibra', label: 'Fibra' },
  { value: 'vinil', label: 'Vinil' },
  { value: 'concreto', label: 'Concreto' },
]

function NovoClienteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const supabase = createClient()
  const { workspace } = useWorkspace()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    pool_type: '' as PoolType | '',
    pool_size: '',
  })

  useEffect(() => {
    if (editId) {
      getCustomer(supabase, editId).then((c) => {
        setForm({
          name: c.name,
          phone: c.phone || '',
          address: c.address || '',
          pool_type: c.pool_type || '',
          pool_size: c.pool_size || '',
        })
      })
    }
  }, [editId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        pool_type: (form.pool_type || null) as PoolType | null,
        pool_size: form.pool_size || null,
      }

      if (editId) {
        await updateCustomer(supabase, editId, data, workspace?.id)
      } else {
        await createCustomer(supabase, data, workspace?.id)
      }
      router.push('/clientes')
    } catch (err) {
      console.error('Erro ao salvar cliente:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {editId ? 'Editar Cliente' : 'Novo Cliente'}
      </h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <Input label="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input label="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
        <Input label="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <Select label="Tipo de Piscina" options={poolOptions} value={form.pool_type} onChange={(e) => setForm({ ...form, pool_type: e.target.value as PoolType })} />
        <Input label="Tamanho da Piscina" value={form.pool_size} onChange={(e) => setForm({ ...form, pool_size: e.target.value })} placeholder="Ex: 8x4m, 50.000L" />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : editId ? 'Atualizar' : 'Cadastrar'}</Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/clientes')}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}

export default function NovoClientePage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
      <NovoClienteForm />
    </Suspense>
  )
}
