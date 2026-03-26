'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createProduct, getProduct, updateProduct } from '@/services/products'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Opções de unidade de medida
const unitOptions = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm²', label: 'Metro quadrado (m²)' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'saco', label: 'Saco' },
]

function NovoProdutoForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const supabase = createClient()
  const { workspace } = useWorkspace()

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    unit: 'un',
    purchase_price: '',
    sale_price: '',
    stock_quantity: '',
  })

  // Carrega dados no modo edição
  useEffect(() => {
    if (editId) {
      getProduct(supabase, editId).then((p) => {
        setForm({
          name: p.name,
          description: p.description || '',
          unit: p.unit,
          purchase_price: String(p.purchase_price),
          sale_price: String(p.sale_price),
          stock_quantity: String(p.stock_quantity),
        })
      })
    }
  }, [editId])

  // Margem de lucro em tempo real
  const margem =
    form.purchase_price && form.sale_price
      ? (((parseFloat(form.sale_price) - parseFloat(form.purchase_price)) / parseFloat(form.purchase_price)) * 100)
      : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const data = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        unit: form.unit,
        purchase_price: parseFloat(form.purchase_price) || 0,
        sale_price: parseFloat(form.sale_price) || 0,
        stock_quantity: parseFloat(form.stock_quantity) || 0,
      }

      if (editId) {
        await updateProduct(supabase, editId, data)
      } else {
        await createProduct(supabase, data, workspace?.id)
      }
      router.push('/estoque')
    } catch (err) {
      console.error('Erro ao salvar produto:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {editId ? 'Editar Produto' : 'Novo Produto'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">

        <Input
          label="Nome do produto *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Ex: Cloro granulado, Algicida, Floclaro..."
          required
        />

        <Input
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Informações adicionais (opcional)"
        />

        {/* Unidade de medida */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Unidade</label>
          <select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {unitOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <Input
          label={`Quantidade em estoque (${form.unit})`}
          type="number"
          step="0.001"
          min="0"
          value={form.stock_quantity}
          onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
          placeholder="0"
        />

        {/* Preços lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Preço de compra (R$) *"
            type="number"
            step="0.01"
            min="0"
            value={form.purchase_price}
            onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
            placeholder="0,00"
            required
          />
          <Input
            label="Preço de venda (R$) *"
            type="number"
            step="0.01"
            min="0"
            value={form.sale_price}
            onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
            placeholder="0,00"
            required
          />
        </div>

        {/* Margem de lucro calculada em tempo real */}
        {margem !== null && !isNaN(margem) && (
          <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
            margem >= 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : margem >= 10 ? 'bg-amber-50 text-amber-700 border border-amber-200'
            : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            Margem de lucro: {margem.toFixed(1)}%
            {margem < 0 && ' — preço de venda menor que o custo!'}
            {margem >= 0 && margem < 10 && ' — margem baixa'}
            {margem >= 10 && margem < 30 && ' — margem razoável'}
            {margem >= 30 && ' — boa margem'}
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : editId ? 'Atualizar' : 'Cadastrar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/estoque')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NovoProdutoPage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
      <NovoProdutoForm />
    </Suspense>
  )
}
