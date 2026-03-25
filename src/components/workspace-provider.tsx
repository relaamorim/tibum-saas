'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
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
      setState({
        workspace: data?.workspace ?? null,
        role: data?.role ?? null,
        subscription: data?.subscription ?? null,
        plan: data?.plan ?? null,
        loading: false,
        isAdmin: data?.role === 'admin',
      })
    } catch {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <WorkspaceContext.Provider value={{ ...state, refresh: load }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
