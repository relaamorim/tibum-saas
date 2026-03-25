-- ============================================
-- TiBum SaaS - Migration v3: Super Admin e Bloqueio de Workspaces
-- Execute no Supabase SQL Editor APÓS o migration_v2_saas.sql
-- ============================================

-- ──────────────────────────────────────────
-- 1. ADICIONAR CAMPOS DE BLOQUEIO NA TABELA WORKSPACES
-- ──────────────────────────────────────────
alter table workspaces add column if not exists is_blocked boolean not null default false;
alter table workspaces add column if not exists blocked_at timestamptz;
alter table workspaces add column if not exists blocked_reason text;

-- ──────────────────────────────────────────
-- 2. FUNÇÃO RPC PARA CRIAR WORKSPACE (usada no onboarding)
-- Separa a criação do workspace do contexto RLS do usuário
-- ──────────────────────────────────────────
create or replace function create_workspace(p_name text, p_slug text)
returns json language plpgsql security definer as $$
declare
  v_workspace_id uuid;
  v_plan_id uuid;
  v_result json;
begin
  -- Cria o workspace
  insert into workspaces (name, slug)
  values (p_name, p_slug)
  returning id into v_workspace_id;

  -- Adiciona o criador como admin
  insert into workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, auth.uid(), 'admin');

  -- Pega o plano Gratuito
  select id into v_plan_id from plans where name = 'Gratuito' limit 1;
  if v_plan_id is null then
    select id into v_plan_id from plans order by price_monthly asc limit 1;
  end if;

  -- Cria assinatura no plano Gratuito (trial de 14 dias)
  insert into subscriptions (workspace_id, plan_id, status)
  values (v_workspace_id, v_plan_id, 'trialing');

  -- Retorna o workspace criado
  select row_to_json(w) into v_result
  from workspaces w
  where w.id = v_workspace_id;

  return v_result;
end;
$$;

-- ──────────────────────────────────────────
-- 3. ATUALIZAR POLÍTICA DE LEITURA DOS WORKSPACES
-- Permite que o super admin veja todos os workspaces
-- (A verificação do super admin é feita no código, usando service role)
-- ──────────────────────────────────────────

-- Índice para busca por slug (melhora performance na criação de workspace)
create index if not exists idx_workspaces_slug on workspaces(slug);

-- Índice para busca por bloqueio (painel admin)
create index if not exists idx_workspaces_is_blocked on workspaces(is_blocked);
