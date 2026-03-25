-- ============================================
-- TiBum SaaS - Migration v2: Arquitetura Multi-Tenant
-- Execute no Supabase SQL Editor APÓS o schema.sql
-- ============================================

-- ──────────────────────────────────────────
-- 1. WORKSPACES (empresas / tenants)
-- ──────────────────────────────────────────
create table workspaces (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ──────────────────────────────────────────
-- 2. MEMBROS DO WORKSPACE (RBAC)
-- ──────────────────────────────────────────
create table workspace_members (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('admin', 'technician')) not null default 'technician',
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- ──────────────────────────────────────────
-- 3. PLANOS DE ASSINATURA
-- ──────────────────────────────────────────
create table plans (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  price_monthly decimal(10,2) not null default 0,
  max_customers int,          -- null = ilimitado
  max_members int,            -- null = ilimitado
  features jsonb default '[]',
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Planos padrão do TiBum
insert into plans (name, price_monthly, max_customers, max_members, features) values
  ('Gratuito', 0.00, 10, 1, '["Dashboard", "Clientes", "Agenda básica"]'),
  ('Starter', 49.90, 50, 3, '["Tudo do Gratuito", "Serviços", "Financeiro", "Relatórios"]'),
  ('Pro', 99.90, null, 10, '["Tudo do Starter", "Membros ilimitados", "API WhatsApp", "Suporte prioritário"]');

-- ──────────────────────────────────────────
-- 4. ASSINATURAS DOS WORKSPACES
-- ──────────────────────────────────────────
create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null unique,
  plan_id uuid references plans(id) not null,
  status text check (status in ('trialing', 'active', 'canceled', 'past_due')) not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  external_id text,           -- ID no Stripe (futuro)
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────
-- 5. AUDIT LOGS (rastreabilidade)
-- ──────────────────────────────────────────
create table audit_logs (
  id uuid default gen_random_uuid() primary key,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  user_id uuid references auth.users(id),
  action text not null,         -- 'create', 'update', 'delete', 'login', etc.
  resource_type text not null,  -- 'customer', 'schedule', 'service', 'payment', 'member'
  resource_id uuid,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,               -- IP, user agent, detalhes extras
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────
-- 6. ADICIONAR workspace_id NAS TABELAS EXISTENTES
-- ──────────────────────────────────────────
-- Mantém user_id para backward compatibility (quem criou o registro)
alter table customers add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table schedules add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table services add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table payments add column if not exists workspace_id uuid references workspaces(id) on delete cascade;

-- ──────────────────────────────────────────
-- 7. ÍNDICES DE PERFORMANCE
-- ──────────────────────────────────────────
create index idx_workspace_members_workspace_id on workspace_members(workspace_id);
create index idx_workspace_members_user_id on workspace_members(user_id);
create index idx_subscriptions_workspace_id on subscriptions(workspace_id);
create index idx_audit_logs_workspace_id on audit_logs(workspace_id);
create index idx_audit_logs_created_at on audit_logs(created_at desc);
create index idx_customers_workspace_id on customers(workspace_id);
create index idx_schedules_workspace_id on schedules(workspace_id);
create index idx_services_workspace_id on services(workspace_id);
create index idx_payments_workspace_id on payments(workspace_id);

-- ──────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- ──────────────────────────────────────────
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table audit_logs enable row level security;

-- Workspaces: membros veem/atualizam; apenas auth vê
create policy "Membros acessam seu workspace"
  on workspaces for select
  using (
    id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Admins atualizam workspace"
  on workspaces for update
  using (
    id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Usuários criam workspaces"
  on workspaces for insert
  with check (true);

-- Workspace members: membros veem; admins gerenciam
create policy "Membros veem colegas"
  on workspace_members for select
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Admins inserem membros"
  on workspace_members for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
    or user_id = auth.uid() -- permite o próprio usuário entrar
  );

create policy "Admins removem membros"
  on workspace_members for delete
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins atualizam roles"
  on workspace_members for update
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Planos: leitura pública (para exibir pricing)
create policy "Planos são públicos para leitura"
  on plans for select
  using (is_active = true);

-- Subscriptions: apenas membros do workspace
create policy "Membros veem assinatura do workspace"
  on subscriptions for select
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

create policy "Sistema gerencia assinaturas"
  on subscriptions for all
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Audit logs: leitura por admins; inserção por qualquer membro
create policy "Admins leem audit logs"
  on audit_logs for select
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Membros inserem audit logs"
  on audit_logs for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────
-- 9. ATUALIZAR POLÍTICAS DAS TABELAS EXISTENTES
-- Suporta tanto registros antigos (user_id) quanto novos (workspace_id)
-- ──────────────────────────────────────────

-- Clientes
drop policy if exists "Usuários gerenciam seus clientes" on customers;
create policy "Acesso a clientes por workspace ou user_id"
  on customers for all
  using (
    user_id = auth.uid()
    or workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

-- Agendamentos
drop policy if exists "Usuários gerenciam seus agendamentos" on schedules;
create policy "Acesso a agendamentos por workspace ou user_id"
  on schedules for all
  using (
    user_id = auth.uid()
    or workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

-- Serviços
drop policy if exists "Usuários gerenciam seus serviços" on services;
create policy "Acesso a serviços por workspace ou user_id"
  on services for all
  using (
    user_id = auth.uid()
    or workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

-- Pagamentos
drop policy if exists "Usuários gerenciam seus pagamentos" on payments;
create policy "Acesso a pagamentos por workspace ou user_id"
  on payments for all
  using (
    user_id = auth.uid()
    or workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────
-- 10. MIGRAÇÃO DE DADOS EXISTENTES
-- Cria um workspace para cada usuário existente (roda apenas uma vez)
-- ──────────────────────────────────────────

-- Função helper para criar workspace de usuários legados
create or replace function migrate_legacy_users()
returns void language plpgsql security definer as $$
declare
  r record;
  new_workspace_id uuid;
  starter_plan_id uuid;
begin
  select id into starter_plan_id from plans where name = 'Starter' limit 1;

  -- Para cada user_id único nos dados existentes
  for r in
    select distinct user_id from customers
    union
    select distinct user_id from schedules
    union
    select distinct user_id from services
    union
    select distinct user_id from payments
  loop
    -- Cria workspace se o usuário ainda não tem um
    if not exists (
      select 1 from workspace_members where user_id = r.user_id
    ) then
      -- Cria workspace
      insert into workspaces (name, slug)
      values ('Minha Empresa', 'empresa-' || substr(r.user_id::text, 1, 8))
      returning id into new_workspace_id;

      -- Adiciona como admin
      insert into workspace_members (workspace_id, user_id, role)
      values (new_workspace_id, r.user_id, 'admin');

      -- Cria assinatura no plano Starter
      insert into subscriptions (workspace_id, plan_id, status)
      values (new_workspace_id, starter_plan_id, 'active');

      -- Migra os dados existentes para o workspace
      update customers set workspace_id = new_workspace_id
        where user_id = r.user_id and workspace_id is null;
      update schedules set workspace_id = new_workspace_id
        where user_id = r.user_id and workspace_id is null;
      update services set workspace_id = new_workspace_id
        where user_id = r.user_id and workspace_id is null;
      update payments set workspace_id = new_workspace_id
        where user_id = r.user_id and workspace_id is null;
    end if;
  end loop;
end;
$$;

-- Executa a migração
select migrate_legacy_users();
