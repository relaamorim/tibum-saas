-- ============================================
-- TiBum SaaS - Migration v6: Estoque e Vendas
-- Execute no Supabase SQL Editor APÓS o migration_v5_customer_fields.sql
-- ============================================

-- ──────────────────────────────────────────
-- 1. TABELA DE PRODUTOS (estoque)
-- ──────────────────────────────────────────
create table if not exists products (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  unit          text not null default 'un',       -- un, kg, L, m, m², caixa, pct
  purchase_price numeric(10,2) not null default 0, -- preço de compra (custo)
  sale_price     numeric(10,2) not null default 0, -- preço de venda
  stock_quantity numeric(10,3) not null default 0, -- quantidade atual em estoque
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ──────────────────────────────────────────
-- 2. TABELA DE VENDAS DE PRODUTOS
-- ──────────────────────────────────────────
create table if not exists product_sales (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid references workspaces(id) on delete cascade,
  user_id        uuid references auth.users(id) on delete cascade,
  product_id     uuid references products(id) on delete cascade,
  quantity       numeric(10,3) not null,
  unit_price     numeric(10,2) not null,   -- preço de venda no momento da venda
  purchase_price numeric(10,2) not null,   -- preço de compra no momento (para calcular lucro histórico)
  notes          text,
  sold_at        timestamptz default now(),
  created_at     timestamptz default now()
);

-- ──────────────────────────────────────────
-- 3. ÍNDICES PARA PERFORMANCE
-- ──────────────────────────────────────────
create index if not exists idx_products_workspace on products(workspace_id);
create index if not exists idx_product_sales_product on product_sales(product_id);
create index if not exists idx_product_sales_workspace on product_sales(workspace_id);
create index if not exists idx_product_sales_sold_at on product_sales(sold_at desc);

-- ──────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ──────────────────────────────────────────
alter table products enable row level security;
alter table product_sales enable row level security;

-- Membros do workspace ou dono (legado) podem acessar produtos
create policy "workspace_members_can_manage_products"
  on products for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
    or user_id = auth.uid()
  );

-- Membros do workspace ou dono (legado) podem acessar vendas
create policy "workspace_members_can_manage_sales"
  on product_sales for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
    or user_id = auth.uid()
  );
