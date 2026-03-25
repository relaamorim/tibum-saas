import { updateSession } from '@/lib/supabase/middleware'
import type { NextRequest } from 'next/server'

// Next.js 16: arquivo renomeado de middleware.ts para proxy.ts
export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // Protege todas as rotas exceto arquivos estáticos e imagens
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
