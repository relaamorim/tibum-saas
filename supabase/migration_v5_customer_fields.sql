-- ============================================
-- TiBum SaaS - Migration v5: Campos dinâmicos e fotos de clientes
-- Execute no Supabase SQL Editor APÓS o migration_v4_admin_contact.sql
-- ============================================

-- ──────────────────────────────────────────
-- 1. CAMPO DE CARACTERÍSTICAS DINÂMICAS (JSON)
-- Armazena pares chave/valor definidos pelo admin da empresa
-- Ex: { "Tipo": "Fibra", "Volume": "50.000L", "Tratamento": "Cloro" }
-- ──────────────────────────────────────────
alter table customers add column if not exists custom_fields jsonb default '{}';

-- ──────────────────────────────────────────
-- 2. CAMPO DE FOTOS (array de URLs públicas)
-- Armazena URLs das fotos salvas no Supabase Storage
-- ──────────────────────────────────────────
alter table customers add column if not exists photos text[] default '{}';

-- ──────────────────────────────────────────
-- 3. CRIAR BUCKET DE ARMAZENAMENTO
-- Execute no Supabase Dashboard > Storage > New Bucket:
--   Nome: customer-photos
--   Público: SIM (para exibir as fotos no app)
--   Tamanho máximo por arquivo: 5 MB
-- ──────────────────────────────────────────

-- ──────────────────────────────────────────
-- 4. POLÍTICAS DO BUCKET (execute APÓS criar o bucket no Dashboard)
-- ──────────────────────────────────────────

-- Usuários autenticados podem fazer upload
create policy "auth_upload_customer_photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'customer-photos');

-- Qualquer pessoa pode visualizar (bucket público)
create policy "public_read_customer_photos"
  on storage.objects for select
  using (bucket_id = 'customer-photos');

-- Usuários autenticados podem deletar fotos do seu workspace
create policy "auth_delete_customer_photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'customer-photos');
