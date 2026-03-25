'use client'

import { useEffect, useState, useCallback } from 'react'
import type { WorkspaceAdminView } from '@/types/database'

// Tipo dos planos disponíveis
interface Plan {
  id: string
  name: string
  price_monthly: number
}

// ============================================
// Painel do Criador TiBum
// ============================================

// Cores dos planos e status
const planColors: Record<string, string> = {
  'Gratuito': 'bg-gray-700 text-gray-300',
  'Starter':  'bg-blue-900/60 text-blue-300 border border-blue-700',
  'Pro':      'bg-violet-900/60 text-violet-300 border border-violet-700',
}
const statusColors: Record<string, string> = {
  active:   'bg-emerald-900/60 text-emerald-300 border border-emerald-700',
  trialing: 'bg-amber-900/60 text-amber-300 border border-amber-700',
  canceled: 'bg-red-900/60 text-red-300 border border-red-700',
  past_due: 'bg-orange-900/60 text-orange-300 border border-orange-700',
}
const statusLabels: Record<string, string> = {
  active: 'Ativo', trialing: 'Trial', canceled: 'Cancelado', past_due: 'Em atraso',
}

function formatPrice(price: number) {
  if (price === 0) return 'Gratuito'
  return `R$ ${price.toFixed(2).replace('.', ',')}/mês`
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Modal de detalhes da empresa ────────────────────────────
// Contém todas as informações e ações em um só lugar
function ModalDetalhe({
  workspace,
  plans,
  onClose,
  onBlock,
  onUnblock,
  onSetPlan,
  onDelete,
  actionLoading,
}: {
  workspace: WorkspaceAdminView
  plans: Plan[]
  onClose: () => void
  onBlock: (ws: WorkspaceAdminView, reason: string) => void
  onUnblock: (ws: WorkspaceAdminView) => void
  onSetPlan: (ws: WorkspaceAdminView, planId: string) => void
  onDelete: (ws: WorkspaceAdminView) => void
  actionLoading: boolean
}) {
  // Estado interno do modal: qual painel está ativo
  type View = 'detail' | 'block' | 'plan' | 'delete'
  const [view, setView] = useState<View>('detail')
  const [blockReason, setBlockReason] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(workspace.plan_id ?? '')

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Cabeçalho ── */}
        <div className={`px-6 pt-6 pb-4 border-b border-gray-800 ${workspace.is_blocked ? 'bg-red-950/20' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0
                ${workspace.is_blocked ? 'bg-red-900/40 border border-red-800' : 'bg-violet-900/40 border border-violet-800'}`}>
                <span className="text-2xl">{workspace.is_blocked ? '🔒' : '🏢'}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">{workspace.name}</h2>
                <p className="text-sm text-gray-500">/{workspace.slug}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors mt-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Aviso de bloqueio */}
          {workspace.is_blocked && (
            <div className="mt-3 bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              <p className="text-xs text-red-400 font-medium">Acesso bloqueado em {workspace.blocked_at ? formatDate(workspace.blocked_at) : '—'}</p>
              {workspace.blocked_reason && (
                <p className="text-xs text-red-300 mt-0.5">{workspace.blocked_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* ── Corpo — varia conforme o view ── */}
        <div className="px-6 py-5">

          {/* ─── VIEW: DETALHES (padrão) ─────────────── */}
          {view === 'detail' && (
            <div className="space-y-5">

              {/* Dados do Administrador */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Administrador</p>
                <div className="bg-gray-800/60 rounded-xl p-4 space-y-2.5">
                  <InfoRow icon="👤" label="Nome"      value={workspace.admin_name} />
                  <InfoRow icon="📧" label="Email"     value={workspace.admin_email} link={workspace.admin_email ? `mailto:${workspace.admin_email}` : undefined} />
                  <InfoRow icon="📱" label="WhatsApp"  value={workspace.admin_whatsapp} link={workspace.admin_whatsapp ? `https://wa.me/${workspace.admin_whatsapp.replace(/\D/g, '')}` : undefined} />
                </div>
              </section>

              {/* Assinatura */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Assinatura</p>
                <div className="bg-gray-800/60 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Plano</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${planColors[workspace.plan_name ?? ''] ?? 'bg-gray-700 text-gray-400'}`}>
                        {workspace.plan_name ?? 'Sem plano'}
                      </span>
                      {workspace.plan_price !== null && (
                        <span className="text-xs text-gray-500">{formatPrice(workspace.plan_price)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Status</span>
                    {workspace.subscription_status ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[workspace.subscription_status] ?? ''}`}>
                        {statusLabels[workspace.subscription_status] ?? workspace.subscription_status}
                      </span>
                    ) : <span className="text-xs text-gray-600">—</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Membros</span>
                    <span className="text-sm text-white">{workspace.member_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Clientes cadastrados</span>
                    <span className="text-sm text-white">{workspace.customer_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Cadastro</span>
                    <span className="text-sm text-gray-300">{formatDate(workspace.created_at)}</span>
                  </div>
                </div>
              </section>

              {/* Ações */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Ações</p>
                <div className="grid grid-cols-3 gap-2">
                  {/* Alterar plano */}
                  <button
                    onClick={() => setView('plan')}
                    className="flex flex-col items-center gap-1.5 p-3 bg-violet-900/30 hover:bg-violet-900/50
                      border border-violet-800 rounded-xl transition-colors"
                  >
                    <span className="text-xl">⭐</span>
                    <span className="text-xs text-violet-300 font-medium">Alterar Plano</span>
                  </button>

                  {/* Bloquear / Desbloquear */}
                  {workspace.is_blocked ? (
                    <button
                      onClick={() => { onUnblock(workspace) }}
                      disabled={actionLoading}
                      className="flex flex-col items-center gap-1.5 p-3 bg-emerald-900/30 hover:bg-emerald-900/50
                        border border-emerald-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <span className="text-xl">✅</span>
                      <span className="text-xs text-emerald-300 font-medium">Desbloquear</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setView('block')}
                      className="flex flex-col items-center gap-1.5 p-3 bg-amber-900/30 hover:bg-amber-900/50
                        border border-amber-800 rounded-xl transition-colors"
                    >
                      <span className="text-xl">🔒</span>
                      <span className="text-xs text-amber-300 font-medium">Bloquear</span>
                    </button>
                  )}

                  {/* Excluir */}
                  <button
                    onClick={() => setView('delete')}
                    className="flex flex-col items-center gap-1.5 p-3 bg-red-900/30 hover:bg-red-900/50
                      border border-red-800 rounded-xl transition-colors"
                  >
                    <span className="text-xl">🗑️</span>
                    <span className="text-xs text-red-300 font-medium">Excluir</span>
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* ─── VIEW: BLOQUEAR ──────────────────────────── */}
          {view === 'block' && (
            <div>
              <button onClick={() => setView('detail')} className="text-xs text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1">
                ← Voltar
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-900/40 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🔒</span>
                </div>
                <h3 className="text-base font-semibold text-amber-400">Bloquear Acesso</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                O acesso de <strong className="text-white">{workspace.name}</strong> será negado imediatamente para todos os usuários.
              </p>
              <label className="block text-xs text-gray-400 mb-1">Motivo do bloqueio (opcional)</label>
              <textarea
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ex: pagamento em atraso, violação dos termos..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm
                  resize-none h-24 focus:outline-none focus:border-amber-600 mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setView('detail')} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => onBlock(workspace, blockReason)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Confirmar bloqueio
                </button>
              </div>
            </div>
          )}

          {/* ─── VIEW: ALTERAR PLANO ─────────────────────── */}
          {view === 'plan' && (
            <div>
              <button onClick={() => setView('detail')} className="text-xs text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1">
                ← Voltar
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-violet-900/40 rounded-xl flex items-center justify-center">
                  <span className="text-xl">⭐</span>
                </div>
                <h3 className="text-base font-semibold text-violet-400">Alterar Plano</h3>
              </div>
              <div className="space-y-2 mb-5">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors
                      ${selectedPlan === plan.id
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
                <button onClick={() => setView('detail')} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => onSetPlan(workspace, selectedPlan)}
                  disabled={!selectedPlan || selectedPlan === workspace.plan_id || actionLoading}
                  className="flex-1 px-4 py-2 bg-violet-700 hover:bg-violet-600 text-white rounded-xl font-medium
                    transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* ─── VIEW: EXCLUIR ────────────────────────────── */}
          {view === 'delete' && (
            <div>
              <button onClick={() => setView('detail')} className="text-xs text-gray-500 hover:text-gray-300 mb-4 flex items-center gap-1">
                ← Voltar
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-900/40 rounded-xl flex items-center justify-center">
                  <span className="text-xl">🗑️</span>
                </div>
                <h3 className="text-base font-semibold text-red-400">Excluir Empresa</h3>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <p className="font-semibold text-white">{workspace.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">/{workspace.slug}</p>
                <p className="text-sm text-gray-400 mt-2">
                  {workspace.member_count} membros · {workspace.customer_count} clientes
                </p>
              </div>
              <p className="text-sm text-red-400 mb-5">
                ⚠️ Ação irreversível. Todos os dados serão apagados permanentemente.
                O slug ficará disponível para outra empresa.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setView('detail')} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => onDelete(workspace)}
                  disabled={actionLoading}
                  className="flex-1 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  Excluir definitivamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Linha de informação reutilizável dentro do modal
function InfoRow({ icon, label, value, link }: { icon: string; label: string; value: string | null; link?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-400 shrink-0">{icon} {label}</span>
      {value ? (
        link ? (
          <a href={link} target="_blank" rel="noopener noreferrer"
            className="text-sm text-cyan-400 hover:text-cyan-300 truncate max-w-[220px] transition-colors">
            {value}
          </a>
        ) : (
          <span className="text-sm text-white truncate max-w-[220px]">{value}</span>
        )
      ) : (
        <span className="text-sm text-gray-600">Não informado</span>
      )}
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

  // Modal de detalhes
  const [selected, setSelected] = useState<WorkspaceAdminView | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

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

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  function showToast(msg: string, type: 'success' | 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function callPatch(ws: WorkspaceAdminView, body: object, successMsg: string) {
    setActionLoading(true)
    setSelected(null) // fecha o modal enquanto processa
    try {
      const res = await fetch(`/api/super-admin/workspaces/${ws.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (res.ok) {
        showToast(successMsg, 'success')
        await fetchWorkspaces()
      } else {
        showToast(json.error ?? 'Erro na operação', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleBlock   = (ws: WorkspaceAdminView, reason: string) =>
    callPatch(ws, { action: 'block', reason }, `"${ws.name}" bloqueado.`)

  const handleUnblock = (ws: WorkspaceAdminView) =>
    callPatch(ws, { action: 'unblock' }, `"${ws.name}" desbloqueado.`)

  const handleSetPlan = (ws: WorkspaceAdminView, plan_id: string) =>
    callPatch(ws, { action: 'set_plan', plan_id }, `Plano de "${ws.name}" atualizado.`)

  async function handleDelete(ws: WorkspaceAdminView) {
    setActionLoading(true)
    setSelected(null)
    try {
      const res = await fetch(`/api/super-admin/workspaces/${ws.id}`, { method: 'DELETE' })
      if (res.ok) {
        showToast(`"${ws.name}" excluído. Slug liberado.`, 'success')
        await fetchWorkspaces()
      } else {
        const j = await res.json()
        showToast(j.error ?? 'Erro ao excluir', 'error')
      }
    } finally {
      setActionLoading(false)
    }
  }

  const filtered = workspaces.filter((w) => {
    const matchSearch = w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.slug.toLowerCase().includes(search.toLowerCase()) ||
      (w.admin_email ?? '').toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filterBlocked === 'all' ||
      (filterBlocked === 'blocked' && w.is_blocked) ||
      (filterBlocked === 'active' && !w.is_blocked)
    return matchSearch && matchFilter
  })

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium
          ${toast.type === 'success' ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'}`}>
          {toast.type === 'success' ? '✓ ' : '✗ '}{toast.msg}
        </div>
      )}

      {/* Modal de detalhes */}
      {selected && (
        <ModalDetalhe
          workspace={selected}
          plans={plans}
          onClose={() => setSelected(null)}
          onBlock={handleBlock}
          onUnblock={handleUnblock}
          onSetPlan={handleSetPlan}
          onDelete={handleDelete}
          actionLoading={actionLoading}
        />
      )}

      {/* Título */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Clientes Cadastrados</h2>
        <p className="text-gray-400 text-sm">Clique em uma empresa para ver detalhes e gerenciar</p>
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

      {/* Busca e filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Buscar por nome, slug ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm
            placeholder-gray-500 focus:outline-none focus:border-violet-600"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'blocked'] as const).map((f) => (
            <button key={f} onClick={() => setFilterBlocked(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${filterBlocked === f ? 'bg-violet-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
              {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : 'Bloqueados'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela clicável */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-400">Carregando empresas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-500">Nenhuma empresa encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">Empresa</th>
                  <th className="text-left px-5 py-3 font-medium">Administrador</th>
                  <th className="text-left px-5 py-3 font-medium">Plano</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-center px-5 py-3 font-medium">Clientes</th>
                  <th className="text-left px-5 py-3 font-medium">Cadastro</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ws) => (
                  <tr
                    key={ws.id}
                    onClick={() => setSelected(ws)}
                    className={`border-b border-gray-800/50 cursor-pointer transition-colors
                      ${ws.is_blocked
                        ? 'bg-red-950/20 hover:bg-red-950/40'
                        : 'hover:bg-violet-900/10'
                      }`}
                  >
                    {/* Nome */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {ws.is_blocked && <span className="text-red-400 text-xs">🔒</span>}
                        <div>
                          <p className="font-medium text-white">{ws.name}</p>
                          <p className="text-xs text-gray-500">/{ws.slug}</p>
                        </div>
                      </div>
                    </td>

                    {/* Admin */}
                    <td className="px-5 py-4">
                      <p className="text-gray-300">{ws.admin_name ?? <span className="text-gray-600">—</span>}</p>
                      {ws.admin_email && <p className="text-xs text-gray-500">{ws.admin_email}</p>}
                    </td>

                    {/* Plano */}
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                        ${planColors[ws.plan_name ?? ''] ?? 'bg-gray-800 text-gray-400'}`}>
                        {ws.plan_name ?? 'Sem plano'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {ws.subscription_status ? (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium
                          ${statusColors[ws.subscription_status] ?? 'bg-gray-800 text-gray-400'}`}>
                          {statusLabels[ws.subscription_status] ?? ws.subscription_status}
                        </span>
                      ) : <span className="text-xs text-gray-600">—</span>}
                    </td>

                    {/* Clientes */}
                    <td className="px-5 py-4 text-center text-gray-300">{ws.customer_count}</td>

                    {/* Data */}
                    <td className="px-5 py-4 text-gray-400 text-xs">{formatDate(ws.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600 mt-4 text-center">
        {filtered.length} empresa{filtered.length !== 1 ? 's' : ''} · clique para gerenciar
      </p>
    </>
  )
}
