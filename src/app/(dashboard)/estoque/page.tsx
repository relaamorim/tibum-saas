'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getProducts, getProductSales, deleteProduct, deleteProductSale, createProductSale } from '@/services/products'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'
import type { Product, ProductSale } from '@/types/database'

// Formata número como moeda brasileira
function moeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Calcula margem de lucro em %
function margem(purchase: number, sale: number) {
  if (purchase === 0) return sale > 0 ? 100 : 0
  return ((sale - purchase) / purchase) * 100
}

export default function EstoquePage() {
  const router = useRouter()
  const supabase = createClient()
  const { workspace, isAdmin, loading: wsLoading } = useWorkspace()

  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<ProductSale[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Estado do modal de venda
  const [saleModal, setSaleModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [saleQty, setSaleQty] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [saleNotes, setSaleNotes] = useState('')
  const [savingSale, setSavingSale] = useState(false)
  const [saleError, setSaleError] = useState('')

  // Tab ativa: produtos ou histórico de vendas
  const [tab, setTab] = useState<'produtos' | 'vendas'>('produtos')

  useEffect(() => {
    if (!wsLoading) loadData()
  }, [workspace, wsLoading])

  async function loadData() {
    try {
      const [prods, sls] = await Promise.all([
        getProducts(supabase, workspace?.id),
        getProductSales(supabase, workspace?.id),
      ])
      setProducts(prods)
      setSales(sls)
    } catch (err) {
      console.error('Erro ao carregar estoque:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Estatísticas calculadas ────────────────────────────────────────────────

  // Valor total do estoque (custo)
  const totalStockCost = products.reduce((sum, p) => sum + p.stock_quantity * p.purchase_price, 0)
  // Receita total de todas as vendas
  const totalRevenue = sales.reduce((sum, s) => sum + s.quantity * s.unit_price, 0)
  // Custo total das vendas
  const totalCost = sales.reduce((sum, s) => sum + s.quantity * s.purchase_price, 0)
  // Lucro total realizado
  const totalProfit = totalRevenue - totalCost

  // Lucro por produto (para exibir na tabela)
  const profitByProduct = sales.reduce<Record<string, { revenue: number; cost: number; qtd: number }>>((acc, s) => {
    if (!acc[s.product_id]) acc[s.product_id] = { revenue: 0, cost: 0, qtd: 0 }
    acc[s.product_id].revenue += s.quantity * s.unit_price
    acc[s.product_id].cost += s.quantity * s.purchase_price
    acc[s.product_id].qtd += s.quantity
    return acc
  }, {})

  // ── Filtro de busca ────────────────────────────────────────────────────────

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredSales = sales.filter((s) =>
    s.product?.name?.toLowerCase().includes(search.toLowerCase())
  )

  // ── Ações ──────────────────────────────────────────────────────────────────

  async function handleDeleteProduct(id: string) {
    if (!confirm('Excluir este produto? As vendas registradas serão perdidas.')) return
    try {
      await deleteProduct(supabase, id)
      setProducts(products.filter((p) => p.id !== id))
      setSales(sales.filter((s) => s.product_id !== id))
    } catch (err) {
      console.error('Erro ao excluir produto:', err)
    }
  }

  async function handleDeleteSale(sale: ProductSale) {
    if (!confirm('Desfazer esta venda? A quantidade será devolvida ao estoque.')) return
    try {
      await deleteProductSale(supabase, sale.id, sale.product_id, sale.quantity)
      await loadData()
    } catch (err) {
      console.error('Erro ao desfazer venda:', err)
    }
  }

  // Abre modal de venda para um produto específico
  function openSaleModal(product: Product) {
    setSelectedProduct(product)
    setSaleQty('1')
    setSalePrice(String(product.sale_price))
    setSaleNotes('')
    setSaleError('')
    setSaleModal(true)
  }

  async function handleConfirmSale(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProduct) return
    const qty = parseFloat(saleQty)
    const price = parseFloat(salePrice)
    if (!qty || qty <= 0) { setSaleError('Informe uma quantidade válida.'); return }
    if (qty > selectedProduct.stock_quantity) { setSaleError(`Estoque insuficiente (${selectedProduct.stock_quantity} ${selectedProduct.unit} disponíveis).`); return }
    if (!price || price < 0) { setSaleError('Informe um preço válido.'); return }

    setSavingSale(true)
    try {
      await createProductSale(supabase, {
        product_id: selectedProduct.id,
        quantity: qty,
        unit_price: price,
        purchase_price: selectedProduct.purchase_price,
        notes: saleNotes || undefined,
        workspaceId: workspace?.id,
      })
      setSaleModal(false)
      await loadData()
    } catch (err) {
      setSaleError('Erro ao registrar venda. Tente novamente.')
      console.error(err)
    } finally {
      setSavingSale(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
        <Button onClick={() => router.push('/estoque/novo')}>+ Novo Produto</Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Produtos cadastrados"
          value={products.length}
          subtitle="em estoque"
        />
        <Card
          title="Valor do estoque"
          value={moeda(totalStockCost)}
          subtitle="preço de custo"
        />
        <Card
          title="Receita total"
          value={moeda(totalRevenue)}
          subtitle={`${sales.length} venda${sales.length !== 1 ? 's' : ''}`}
        />
        <Card
          title="Lucro realizado"
          value={moeda(totalProfit)}
          subtitle={totalRevenue > 0 ? `${((totalProfit / totalRevenue) * 100).toFixed(1)}% de margem` : 'nenhuma venda'}
          className={totalProfit > 0 ? 'border-emerald-200' : ''}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab('produtos')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'produtos' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📦 Produtos
        </button>
        <button
          onClick={() => setTab('vendas')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'vendas' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📈 Histórico de Vendas {sales.length > 0 && <span className="ml-1 bg-cyan-100 text-cyan-700 rounded-full px-1.5 text-xs">{sales.length}</span>}
        </button>
      </div>

      {/* Campo de busca */}
      <Input
        placeholder={tab === 'produtos' ? 'Buscar produto...' : 'Buscar por produto...'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* ── Tab: Produtos ──────────────────────────────────────────────────── */}
      {tab === 'produtos' && (
        <>
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredProducts.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              {search ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado ainda.'}
            </p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium">Produto</th>
                      <th className="text-right px-4 py-3 font-medium">Estoque</th>
                      <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Custo</th>
                      <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Venda</th>
                      <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Margem</th>
                      <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Qtd Vendida</th>
                      <th className="text-right px-4 py-3 font-medium hidden lg:table-cell">Lucro Realizado</th>
                      <th className="text-right px-6 py-3 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProducts.map((p) => {
                      const stats = profitByProduct[p.id]
                      const lucro = stats ? stats.revenue - stats.cost : 0
                      const m = margem(p.purchase_price, p.sale_price)
                      const semEstoque = p.stock_quantity <= 0

                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{p.name}</div>
                            {p.description && (
                              <div className="text-xs text-gray-400 mt-0.5">{p.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Badge color={semEstoque ? 'red' : p.stock_quantity < 5 ? 'yellow' : 'green'}>
                              {p.stock_quantity} {p.unit}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-right text-gray-500 hidden sm:table-cell">
                            {moeda(p.purchase_price)}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-gray-900 hidden sm:table-cell">
                            {moeda(p.sale_price)}
                          </td>
                          <td className="px-4 py-4 text-right hidden md:table-cell">
                            <span className={`font-medium ${m >= 30 ? 'text-emerald-600' : m >= 10 ? 'text-amber-600' : 'text-red-500'}`}>
                              {m.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right text-gray-500 hidden lg:table-cell">
                            {stats ? `${stats.qtd} ${p.unit}` : '—'}
                          </td>
                          <td className="px-4 py-4 text-right hidden lg:table-cell">
                            {stats ? (
                              <span className={`font-medium ${lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {moeda(lucro)}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => openSaleModal(p)}
                                disabled={semEstoque}
                              >
                                Vender
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.push(`/estoque/novo?id=${p.id}`)}
                              >
                                Editar
                              </Button>
                              {isAdmin && (
                                <Button variant="danger" size="sm" onClick={() => handleDeleteProduct(p.id)}>
                                  Excluir
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Histórico de Vendas ───────────────────────────────────────── */}
      {tab === 'vendas' && (
        <>
          {loading ? (
            <p className="text-center text-gray-500 py-8">Carregando...</p>
          ) : filteredSales.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium">Data</th>
                      <th className="text-left px-6 py-3 font-medium">Produto</th>
                      <th className="text-right px-4 py-3 font-medium">Qtd</th>
                      <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Preço Unit.</th>
                      <th className="text-right px-4 py-3 font-medium">Total</th>
                      <th className="text-right px-4 py-3 font-medium hidden md:table-cell">Lucro</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Obs.</th>
                      {isAdmin && <th className="text-right px-6 py-3 font-medium">Ação</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSales.map((s) => {
                      const total = s.quantity * s.unit_price
                      const custo = s.quantity * s.purchase_price
                      const lucro = total - custo
                      const data = new Date(s.sold_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                      })
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-500">{data}</td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {s.product?.name ?? '—'}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-500">
                            {s.quantity} {s.product?.unit ?? ''}
                          </td>
                          <td className="px-4 py-4 text-right text-gray-500 hidden sm:table-cell">
                            {moeda(s.unit_price)}
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-gray-900">
                            {moeda(total)}
                          </td>
                          <td className="px-4 py-4 text-right hidden md:table-cell">
                            <span className={`font-medium ${lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {moeda(lucro)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-gray-400 hidden lg:table-cell text-xs">
                            {s.notes || '—'}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteSale(s)}>
                                Desfazer
                              </Button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Modal de Venda ─────────────────────────────────────────────────── */}
      <Modal
        open={saleModal}
        onClose={() => setSaleModal(false)}
        title={`Registrar Venda — ${selectedProduct?.name ?? ''}`}
      >
        {selectedProduct && (
          <form onSubmit={handleConfirmSale} className="space-y-4">
            {/* Infos do produto */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
              <div className="flex justify-between">
                <span>Estoque disponível:</span>
                <span className="font-medium text-gray-900">
                  {selectedProduct.stock_quantity} {selectedProduct.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Preço de venda sugerido:</span>
                <span className="font-medium text-gray-900">{moeda(selectedProduct.sale_price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Margem:</span>
                <span className="font-medium text-emerald-600">
                  {margem(selectedProduct.purchase_price, selectedProduct.sale_price).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Campos da venda */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Quantidade ({selectedProduct.unit}) *
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                max={selectedProduct.stock_quantity}
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Preço de venda (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Observações
              </label>
              <input
                type="text"
                placeholder="Ex: vendido para cliente X"
                value={saleNotes}
                onChange={(e) => setSaleNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Resumo da venda em tempo real */}
            {saleQty && salePrice && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total da venda:</span>
                  <span className="font-semibold text-gray-900">
                    {moeda(parseFloat(saleQty) * parseFloat(salePrice))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Lucro estimado:</span>
                  <span className="font-semibold text-emerald-700">
                    {moeda(parseFloat(saleQty) * (parseFloat(salePrice) - selectedProduct.purchase_price))}
                  </span>
                </div>
              </div>
            )}

            {saleError && (
              <p className="text-sm text-red-600">{saleError}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={savingSale}>
                {savingSale ? 'Salvando...' : 'Confirmar Venda'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setSaleModal(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
