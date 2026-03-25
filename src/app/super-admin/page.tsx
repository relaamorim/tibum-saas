'use client'

import { useEffect, useState, useCallback } from 'react'
import type { WorkspaceAdminView } from '@/types/database'

// Tipo simples para os planos disponíveis
interface Plan {
  id: string
  name: string
  price_monthly: number
}

// ============================================
// Painel do Criador TiBum
// Lista todos os clientes (workspaces) com plano, status e ações
// ============================================

// Cores dos planos
const planColors: Record<string, string> = {
  'Gratuito': 'bg-gray-700 text-gray-300',
  'Starter': 'bg-blue-900/60 text-blue-300 border border-blue-700',
  'Pro': 'bg-violet-900/60 text-violet-300 border border-violet-700',
}

// Cores do status da assinatura
const statusColors: Record<string, string> = {
  active: 'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
  trialing: 'bg-amber-900/60 text-amber-300 border border-amber-700',
  canceled: 'bg-red-900/60 text-red-300 border border-red-700',
  past_due: 'bg-orange-900/60 text-orange-300 border border-orange-700',
}

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Trial',
  canceled: 'Cancelado',
  past_due: 'Em atraso',
}

// Modal de confirmação de exclusão
function ModalExcluir({
  workspace,
  onConfirm,
  onCancel,
}: {
  workspace: WorkspaceAdminView
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-red-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-900/50 rounded-xl flex items-center justify-center">
            <span className="text-xl">🗑️</span>
          </div>
          <h2 className="text-lg font-bold text-red-400">Excluir Empresa</h2>
        </div>
        <p className="text-gray-300 mb-2">
          Você está prestes a excluir permanentemente:
        </p>
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <p className="font-semibold text-white">{workspace.name}</p>
          <p className="text-sm text-gray-400">Slug: {workspace.slug}</p>
          <p className="text-sm text-gray-400">
            {workspace.member_count} membros · {workspace.customer_count} clientes
          </p>
        </div>
        <p className="text-sm text-red-400 mb-6">
          ⚠️ Esta ação é irreversível. Todos os dados serão apagados e o slug
          ficará livre para outra empresa.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Excluir definitivamente
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de bloqueio (pede motivo)
function ModalBloquear({
  workspace,
  onConfirm,
  onCancel,
}: {
  workspace: WorkspaceAdminView
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-amber-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-900/50 rounded-xl flex items-center justify-center">
            <span className="text-xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-amber-400">Bloquear Acesso</h2>
        </div>
        <p className="text-gray-300 mb-1">Bloqueando: <strong className="text-white">{workspace.name}</strong></p>
        <p className="text-sm text-gray-400 mb-4">
          O acesso ao sistema será negado imediatamente para todos os usuários desta empresa.
        </p>
        <label className="block text-sm text-gray-400 mb-1">
          Motivo do bloqueio (opcional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: pagamento em atraso, violação dos termos..."
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none h-20 focus:outline-none focus:border-amber-600 mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="flex-1 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
          >
            Bloquear acesso
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de troca de plano
function ModalPlano({
  workspace,
  plans,
  onConfirm,
  onCancel,
}: {
  workspace: WorkspaceAdminView
  plans: Plan[]
  onConfirm: (planId: string) => void
  onCancel: () => void
}) {
  const [selected, setSelected] = useState(workspace.plan_id ?? '')

  function formatPrice(price: number) {
    if (price === 0) return 'Gratuito'
    return `R$ ${price.toFixed(2).replace('.', ',')}/mês`
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-violet-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-violet-900/50 rounded-xl flex items-center justify-center">
            <span className="text-xl">⭐</span>
          </div>
          <h2 className="text-lg font-bold text-violet-400">Alterar Plano</h2>
        </div>

        <p className="text-gray-400 text-sm mb-4">
          Empresa: <strong className="text-white">{workspace.name}</strong>
        </p>

        {/* Lista de planos para selecionar */}
        <div className="space-y-2 mb-6">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors text-left
                ${selected === plan.id
                  ? 'bg-violet-900/50 border-violet-600 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
            >
              <span className="font-medium">{plan.name}</span>
              <span className="text-sm">{formatPrice(plan.price_monthly)}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || selected === workspace.plan_id}
            className="flex-1 px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white rounded-lg font-medium
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal da página ──────────────────────────
export default function SuperAdminPage() {
  const [workspaces, setWorkspaces] = useState<WorkspaceAdminView[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [stats, setStats] = useState<{ total: number; blocked: number; by_plan: Record<string, number> } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBlocked, setFilterBlocked] = useState<'all' | 'active' | 'blocked'>('all')

  // Modais
  const [toDelete, setToDelete] = useState<WorkspaceAdminView | null>(null)
  const [toBlock, setToBlock] = useState<WorkspaceAdminView | null>(null)
  const [toChangePlan, setToChangePlan] = useState<WorkspaceAdminView | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Carrega os dados da API
  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/workspaces')
      const json = await res.json()
      if (res.ok) {
        setWorkspaces(json.workspaces)
        setStats(json.stats)
        setPlans(json.plans ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWorkspaces()
  }, [fetchWorkspaces])

  // Exibe toast por 3 segundos
  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Bloquear workspace
  async function handleBlock(workspace: WorkspaceAdminView, reason: string) {
    setToBlock(null)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'block', reason }),
      })
      if (res.ok) {
        showToast(`"${workspace.name}" bloqueado com sucesso.`, 'success')
        await fetchWorkspaces()
      } else {
        const j = await res.json()
        showToast(j.error ?? 'Erro ao bloquear', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Desbloquear workspace
  async function handleUnblock(workspace: WorkspaceAdminView) {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unblock' }),
      })
      if (res.ok) {
        showToast(`"${workspace.name}" desbloqueado com sucesso.`, 'success')
        await fetchWorkspaces()
      } else {
        const j = await res.json()
        showToast(j.error ?? 'Erro ao desbloquear', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Alterar plano manualmente
  async function handleSetPlan(workspace: WorkspaceAdminView, planId: string) {
    setToChangePlan(null)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/workspaces/${workspace.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_plan', plan_id: planId }),
      })
      const json = await res.json()
      if (res.ok) {
        showToast(`Plano de "${workspace.name}" alterado para ${json.plan_name}.`, 'success')
        await fetchWorkspaces()
      } else {
        showToast(json.error ?? 'Erro ao alterar plano', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Excluir workspace
  async function handleDelete(workspace: WorkspaceAdminView) {
    setToDelete(null)
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/workspaces/${workspace.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast(`"${workspace.name}" excluído. Slug "${workspace.slug}" liberado.`, 'success')
        await fetchWorkspaces()
      } else {
        const j = await res.json()
        showToast(j.error ?? 'Erro ao excluir', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  // Filtra a lista com base na busca e no filtro de status
  const filtered = workspaces.filter((w) => {
    const matchSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.slug.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filterBlocked === 'all' ||
      (filterBlocked === 'blocked' && w.is_blocked) ||
      (filterBlocked === 'active' && !w.is_blocked)
    return matchSearch && matchFilter
  })

  // Formata data para exibição
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <>
      {/* Toast de feedback */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all
            ${toast.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'}`}
        >
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.msg}
        </div>
      )}

      {/* Modais */}
      {toDelete && (
        <ModalExcluir
          workspace={toDelete}
          onConfirm={() => handleDelete(toDelete)}
          onCancel={() => setToDelete(null)}
        />
      )}
      {toBlock && (
        <ModalBloquear
          workspace={toBlock}
          onConfirm={(reason) => handleBlock(toBlock, reason)}
          onCancel={() => setToBlock(null)}
        />
      )}
      {toChangePlan && (
        <ModalPlano
          workspace={toChangePlan}
          plans={plans}
          onConfirm={(planId) => handleSetPlan(toChangePlan, planId)}
          onCancel={() => setToChangePlan(null)}
        />
      )}

      {/* Título */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Clientes Cadastrados</h2>
        <p className="text-gray-400 text-sm">
          Gerencie todas as empresas que usam o TiBum
        </p>
      </div>

      {/* Cards de estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total</p>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">empresas cadastradas</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bloqueadas</p>
            <p className="text-3xl font-bold text-red-400">{stats.blocked}</p>
            <p className="text-xs text-gray-500 mt-1">sem acesso ao sistema</p>
          </div>
          {Object.entries(stats.by_plan).map(([plan, count]) => (
            <div key={plan} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{plan}</p>
              <p className="text-3xl font-bold text-violet-400">{count}</p>
              <p className="text-xs text-gray-500 mt-1">empresas neste plano</p>
            </div>
          ))}
        </div>
      )}

      {/* Barra de busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm
            placeholder-gray-500 focus:outline-none focus:border-violet-600"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'blocked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterBlocked(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${filterBlocked === f
                  ? 'bg-violet-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela de workspaces */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-400">Carregando empresas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-500">
            Nenhuma empresa encontrada para esta busca
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Empresa</th>
                  <th className="text-left px-5 py-3 font-medium">Plano</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-center px-5 py-3 font-medium">Membros</th>
                  <th className="text-center px-5 py-3 font-medium">Clientes</th>
                  <th className="text-left px-5 py-3 font-medium">Cadastro</th>
                  <th className="text-right px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ws) => (
                  <tr
                    key={ws.id}
                    className={`border-b border-gray-800/50 transition-colors
                      ${ws.is_blocked ? 'bg-red-950/20' : 'hover:bg-gray-800/30'}`}
                  >
                    {/* Nome e slug */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {ws.is_blocked && (
                          <span title="Bloqueado" className="text-red-400">🔒</span>
                        )}
                        <div>
                          <p className="font-medium text-white">{ws.name}</p>
                          <p className="text-xs text-gray-500">{ws.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Plano */}
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                        ${planColors[ws.plan_name ?? ''] ?? 'bg-gray-800 text-gray-400'}`}>
                        {ws.plan_name ?? 'Sem plano'}
                      </span>
                    </td>

                    {/* Status da assinatura */}
                    <td className="px-5 py-4">
                      {ws.subscription_status ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                          ${statusColors[ws.subscription_status] ?? 'bg-gray-800 text-gray-400'}`}>
                          {statusLabels[ws.subscription_status] ?? ws.subscription_status}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>

                    {/* Contadores */}
                    <td className="px-5 py-4 text-center text-gray-300">{ws.member_count}</td>
                    <td className="px-5 py-4 text-center text-gray-300">{ws.customer_count}</td>

                    {/* Data de cadastro */}
                    <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(ws.created_at)}</td>

                    {/* Ações */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Alterar plano */}
                        <button
                          onClick={() => setToChangePlan(ws)}
                          disabled={actionLoading}
                          title="Alterar plano"
                          className="px-3 py-1.5 text-xs bg-violet-900/30 hover:bg-violet-900/60
                            text-violet-400 border border-violet-800 rounded-lg transition-colors
                            disabled:opacity-50"
                        >
                          ⭐ Plano
                        </button>

                        {/* Bloquear / Desbloquear */}
                        {ws.is_blocked ? (
                          <button
                            onClick={() => handleUnblock(ws)}
                            disabled={actionLoading}
                            title="Desbloquear acesso"
                            className="px-3 py-1.5 text-xs bg-emerald-900/50 hover:bg-emerald-800/70
                              text-emerald-400 border border-emerald-800 rounded-lg transition-colors
                              disabled:opacity-50"
                          >
                            ✓ Desbloquear
                          </button>
                        ) : (
                          <button
                            onClick={() => setToBlock(ws)}
                            disabled={actionLoading}
                            title="Bloquear acesso"
                            className="px-3 py-1.5 text-xs bg-amber-900/30 hover:bg-amber-900/60
                              text-amber-400 border border-amber-800 rounded-lg transition-colors
                              disabled:opacity-50"
                          >
                            🔒 Bloquear
                          </button>
                        )}

                        {/* Excluir */}
                        <button
                          onClick={() => setToDelete(ws)}
                          disabled={actionLoading}
                          title="Excluir empresa"
                          className="px-3 py-1.5 text-xs bg-red-900/30 hover:bg-red-900/60
                            text-red-400 border border-red-800 rounded-lg transition-colors
                            disabled:opacity-50"
                        >
                          🗑️ Excluir
                        </button>
                      </div>

                      {/* Motivo do bloqueio (se houver) */}
                      {ws.is_blocked && ws.blocked_reason && (
                        <p className="text-xs text-red-500 mt-1 text-right max-w-[200px] ml-auto">
                          {ws.blocked_reason}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-4 text-center">
        {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} exibida{filtered.length !== 1 ? 's' : ''}
      </p>
    </>
  )
}
