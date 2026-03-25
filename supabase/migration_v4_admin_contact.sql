-- ============================================
-- TiBum SaaS - Migration v4: Dados do Administrador
-- Execute no Supabase SQL Editor APÓS o migration_v3_super_admin.sql
-- ============================================

-- ──────────────────────────────────────────
-- 1. ADICIONAR CAMPOS DE CONTATO DO ADMIN NA TABELA WORKSPACES
-- ──────────────────────────────────────────
alter table workspaces add column if not exists admin_email text;
alter table workspaces add column if not exists admin_whatsapp text;

-- ──────────────────────────────────────────
-- 2. ADICIONAR CAMPO NOME NA TABELA WORKSPACE_MEMBERS
-- Armazena o nome de exibição do membro (preenchido no onboarding)
-- ──────────────────────────────────────────
alter table workspace_members add column if not exists name text;

-- ──────────────────────────────────────────
-- 3. ATUALIZAR FUNÇÃO RPC PARA CRIAR WORKSPACE
-- Agora aceita nome, email e WhatsApp do administrador
-- ──────────────────────────────────────────
create or replace function create_workspace(
  p_name text,
  p_slug text,
  p_admin_name text default null,
  p_admin_email text default null,
  p_admin_whatsapp text default null
)
returns json language plpgsql security definer as $$
declare
  v_workspace_id uuid;
  v_plan_id uuid;
  v_result json;
begin
  -- Cria o workspace com os dados de contato do admin
  insert into workspaces (name, slug, admin_email, admin_whatsapp)
  values (p_name, p_slug, p_admin_email, p_admin_whatsapp)
  returning id into v_workspace_id;

  -- Adiciona o criador como admin com nome de exibição
  insert into workspace_members (workspace_id, user_id, role, name)
  values (v_workspace_id, auth.uid(), 'admin', p_admin_name);

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
