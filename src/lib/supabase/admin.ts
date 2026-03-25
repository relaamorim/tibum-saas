import { createClient } from '@supabase/supabase-js'

// ============================================
// Cliente Supabase com service role key
// ATENÇÃO: Este cliente bypassa todas as políticas RLS
// Use APENAS em API routes server-side — NUNCA no frontend
// ============================================

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas')
  }

  return createClient(url, serviceKey, {
    auth: {
      // Não tenta renovar token — é uma chave de serviço, não de usuário
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
