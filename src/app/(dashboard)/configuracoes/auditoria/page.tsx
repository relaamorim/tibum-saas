'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAuditLogs, actionLabels, resourceLabels } from '@/services/audit'
import { useWorkspace } from '@/components/workspace-provider'
import { Badge } from '@/components/ui/badge'
import type { AuditLog, AuditAction } from '@/types/database'

// Cores por tipo de ação
const actionColors: Record<AuditAction, 'green' | 'blue' | 'red' | 'yellow' | 'gray'> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'gray',
  logout: 'gray',
  invite: 'green',
  role_change: 'yellow',
}

const PAGE_SIZE = 50

export default function AuditoriaPage() {
  const supabase = createClient()
  const { workspace } = useWorkspace()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')
  const [filterResource, setFilterResource] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    if (workspace) loadLogs()
  }, [workspace, filterAction, filterResource])

  async function loadLogs() {
    if (!workspace) return
    setLoading(true)
    try {
      const data = await getAuditLogs(supabase, workspace.id, {
        limit: PAGE_SIZE,
        action: filterAction || undefined,
        resourceType: filterResource || undefined,
      })
      setLogs(data)
    } catch (err) {
      console.error('Erro ao carregar logs:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Log de Auditoria</h1>
      <p className="text-sm text-gray-500">
        Todas as ações realizadas no workspace ficam registradas aqui para fins de rastreabilidade.
      </p>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Todas as ações</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterResource}
            onChange={(e) => setFilterResource(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">Todos os recursos</option>
            {Object.entries(resourceLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : logs.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum log encontrado.</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Data/Hora</th>
                  <th className="text-left px-6 py-3 font-medium">Ação</th>
                  <th className="text-left px-6 py-3 font-medium">Recurso</th>
                  <th className="text-left px-6 py-3 font-medium hidden md:table-cell">Usuário</th>
                  <th className="text-right px-6 py-3 font-medium">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-3">
                      <Badge color={actionColors[log.action] ?? 'gray'}>
                        {actionLabels[log.action] ?? log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-700">
                      {resourceLabels[log.resource_type] ?? log.resource_type}
                    </td>
                    <td className="px-6 py-3 hidden md:table-cell">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {log.user_id ? log.user_id.slice(0, 12) + '…' : 'Sistema'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {(log.old_data || log.new_data) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-xs text-cyan-600 hover:text-cyan-700 underline"
                        >
                          Ver dados
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Painel de detalhes lateral / modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detalhes do Log</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 text-xl">
                &times;
              </button>
            </div>
            <div className="space-y-4 text-sm">
              {selectedLog.old_data && (
                <div>
                  <p className="font-medium text-gray-600 mb-1">Antes:</p>
                  <pre className="bg-red-50 text-red-800 p-3 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedLog.old_data, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.new_data && (
                <div>
                  <p className="font-medium text-gray-600 mb-1">Depois:</p>
                  <pre className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedLog.new_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
