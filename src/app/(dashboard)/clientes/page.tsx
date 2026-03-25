'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCustomers, deleteCustomer } from '@/services/customers'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { Customer } from '@/types/database'

const poolTypeColors: Record<string, 'blue' | 'green' | 'yellow'> = {
  fibra: 'blue',
  vinil: 'green',
  concreto: 'yellow',
}

export default function ClientesPage() {
  const router = useRouter()
  const supabase = createClient()
  const { workspace, isAdmin, loading: wsLoading } = useWorkspace()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!wsLoading) loadCustomers()
  }, [workspace, wsLoading])

  async function loadCustomers() {
    try {
      const data = await getCustomers(supabase, workspace?.id)
      setCustomers(data)
    } catch (err) {
      console.error('Erro ao carregar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    try {
      await deleteCustomer(supabase, id, workspace?.id)
      setCustomers(customers.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Erro ao excluir:', err)
    }
  }

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <Button onClick={() => router.push('/clientes/novo')}>+ Novo Cliente</Button>
      </div>

      <Input
        placeholder="Buscar por nome..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum cliente encontrado.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Nome</th>
                  <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Telefone</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Endereço</th>
                  <th className="text-left px-6 py-3 font-medium">Piscina</th>
                  <th className="text-right px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{c.name}</td>
                    <td className="px-6 py-4 text-gray-500 hidden sm:table-cell">{c.phone || '-'}</td>
                    <td className="px-6 py-4 text-gray-500 hidden md:table-cell">{c.address || '-'}</td>
                    <td className="px-6 py-4">
                      {c.pool_type && (
                        <Badge color={poolTypeColors[c.pool_type] || 'gray'}>
                          {c.pool_type} {c.pool_size ? `(${c.pool_size})` : ''}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/clientes/novo?id=${c.id}`)}
                      >
                        Editar
                      </Button>
                      {/* Apenas admins podem excluir */}
                      {isAdmin && (
                        <Button variant="danger" size="sm" onClick={() => handleDelete(c.id)}>
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
    </div>
  )
}
