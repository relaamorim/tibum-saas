import { SupabaseClient } from '@supabase/supabase-js'
import type { Product, ProductSale } from '@/types/database'

// ── Produtos ──────────────────────────────────────────────────────────────────

export async function getProducts(supabase: SupabaseClient, workspaceId?: string) {
  let query = supabase.from('products').select('*').order('name')
  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }
  const { data, error } = await query
  if (error) throw error
  return data as Product[]
}

export async function getProduct(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
  if (error) throw error
  return data as Product
}

export async function createProduct(
  supabase: SupabaseClient,
  form: Omit<Product, 'id' | 'user_id' | 'workspace_id' | 'created_at' | 'updated_at'>,
  workspaceId?: string
) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('products')
    .insert({ ...form, user_id: user!.id, workspace_id: workspaceId ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Product
}

export async function updateProduct(
  supabase: SupabaseClient,
  id: string,
  form: Partial<Omit<Product, 'id' | 'user_id' | 'workspace_id' | 'created_at' | 'updated_at'>>
) {
  const { data, error } = await supabase
    .from('products')
    .update({ ...form, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Product
}

export async function deleteProduct(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

// ── Vendas de Produtos ────────────────────────────────────────────────────────

export async function getProductSales(supabase: SupabaseClient, workspaceId?: string) {
  let query = supabase
    .from('product_sales')
    // Faz join com products para obter nome e unidade
    .select('*, product:products(id, name, unit)')
    .order('sold_at', { ascending: false })

  if (workspaceId) {
    query = query.eq('workspace_id', workspaceId)
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) query = query.eq('user_id', user.id)
  }
  const { data, error } = await query
  if (error) throw error
  return data as ProductSale[]
}

export async function createProductSale(
  supabase: SupabaseClient,
  params: {
    product_id: string
    quantity: number
    unit_price: number
    purchase_price: number
    notes?: string
    workspaceId?: string
  }
) {
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Registra a venda
  const { data: sale, error: saleError } = await supabase
    .from('product_sales')
    .insert({
      product_id: params.product_id,
      quantity: params.quantity,
      unit_price: params.unit_price,
      purchase_price: params.purchase_price,
      notes: params.notes || null,
      user_id: user!.id,
      workspace_id: params.workspaceId ?? null,
    })
    .select('*, product:products(id, name, unit)')
    .single()
  if (saleError) throw saleError

  // 2. Decrementa o estoque do produto
  const { error: stockError } = await supabase.rpc('decrement_stock', {
    p_product_id: params.product_id,
    p_quantity: params.quantity,
  })
  // Fallback manual se a RPC não existir
  if (stockError) {
    const current = await getProduct(supabase, params.product_id)
    await updateProduct(supabase, params.product_id, {
      stock_quantity: Math.max(0, current.stock_quantity - params.quantity),
    })
  }

  return sale as ProductSale
}

export async function deleteProductSale(
  supabase: SupabaseClient,
  saleId: string,
  productId: string,
  quantity: number
) {
  // Exclui a venda
  const { error } = await supabase.from('product_sales').delete().eq('id', saleId)
  if (error) throw error

  // Devolve a quantidade ao estoque
  const current = await getProduct(supabase, productId)
  await updateProduct(supabase, productId, {
    stock_quantity: current.stock_quantity + quantity,
  })
}
