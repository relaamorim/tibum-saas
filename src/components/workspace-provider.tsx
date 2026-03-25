'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getUserWorkspace } from '@/services/workspaces'
import type { Workspace, WorkspaceRole, Plan, Subscription } from '@/types/database'

// ──────────────────────────────────────────────────────────
// Contexto global de workspace — disponível em todo o dashboard
// ──────────────────────────────────────────────────────────

interface WorkspaceState {
  workspace: Workspace | null
  role: WorkspaceRole | null
  subscription: Subscription | null
  plan: Plan | null
  loading: boolean
  isAdmin: boolean
  refresh: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceState>({
  workspace: null,
  role: null,
  subscription: null,
  plan: null,
  loading: true,
  isAdmin: false,
  refresh: async () => {},
})

// Hook para consumir o contexto em qualquer componente
export function useWorkspace() {
  return useContext(WorkspaceContext)
}

interface WorkspaceProviderProps {
  children: React.ReactNode
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [state, setState] = useState<Omit<WorkspaceState, 'refresh'>>({
    workspace: null,
    role: null,
    subscription: null,
    plan: null,
    loading: true,
    isAdmin: false,
  })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await getUserWorkspace(supabase)
      if (!data) {
        // Sem workspace → manda para onboarding
        router.push('/onboarding')
        return
      }
      // Rota de configurações → apenas admins
      if (pathname?.startsWith('/configuracoes') && data.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setState({
        workspace: data.workspace,
        role: data.role,
        subscription: data.subscription ?? null,
        plan: data.plan ?? null,
        loading: false,
        isAdmin: data.role === 'admin',
      })
    } catch {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [pathname])

  useEffect(() => {
    load()
  }, [load])

  return (
    <WorkspaceContext.Provider value={{ ...state, refresh: load }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
