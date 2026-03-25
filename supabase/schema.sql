-- ============================================
-- TiBum SaaS - Schema do Banco de Dados
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Tabela de clientes
create table customers (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  name text not null,
  phone text,
  address text,
  pool_type text check (pool_type in ('fibra', 'vinil', 'concreto')),
  pool_size text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de agendamentos
create table schedules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  customer_id uuid references customers(id) on delete cascade not null,
  date date not null,
  frequency text check (frequency in ('semanal', 'quinzenal', 'mensal')) default 'semanal',
  status text check (status in ('agendado', 'concluido', 'atrasado')) default 'agendado',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de serviços realizados
create table services (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  customer_id uuid references customers(id) on delete cascade not null,
  schedule_id uuid references schedules(id) on delete set null,
  date date not null default current_date,
  notes text,
  products_used text,
  photo_url text,
  created_at timestamptz default now()
);

-- Tabela de pagamentos
create table payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  service_id uuid references services(id) on delete cascade not null,
  amount decimal(10,2) not null,
  status text check (status in ('pago', 'pendente')) default 'pendente',
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Habilitar Row Level Security em todas as tabelas
alter table customers enable row level security;
alter table schedules enable row level security;
alter table services enable row level security;
alter table payments enable row level security;

-- Políticas de acesso: cada usuário só vê seus próprios dados
create policy "Usuários gerenciam seus clientes"
  on customers for all
  using (auth.uid() = user_id);

create policy "Usuários gerenciam seus agendamentos"
  on schedules for all
  using (auth.uid() = user_id);

create policy "Usuários gerenciam seus serviços"
  on services for all
  using (auth.uid() = user_id);

create policy "Usuários gerenciam seus pagamentos"
  on payments for all
  using (auth.uid() = user_id);

-- Índices para performance
create index idx_customers_user_id on customers(user_id);
create index idx_schedules_user_id on schedules(user_id);
create index idx_schedules_date on schedules(date);
create index idx_schedules_customer_id on schedules(customer_id);
create index idx_services_user_id on services(user_id);
create index idx_services_customer_id on services(customer_id);
create index idx_payments_user_id on payments(user_id);
create index idx_payments_service_id on payments(service_id);
