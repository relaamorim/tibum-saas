'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateWorkspace } from '@/services/workspaces'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logAudit } from '@/services/audit'

export default function WorkspaceSettingsPage() {
  const supabase = createClient()
  const { workspace, refresh } = useWorkspace()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Inicializa o formulário com o nome atual quando o workspace carregar
  if (workspace && !name && !loading) {
    setName(workspace.name)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!workspace) return
    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      await updateWorkspace(supabase, workspace.id, { name })
      await logAudit(supabase, {
        workspaceId: workspace.id,
        action: 'update',
        resourceType: 'workspace',
        resourceId: workspace.id,
        newData: { name },
      })
      setSuccess(true)
      refresh()
    } catch {
      setError('Erro ao atualizar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Configurações do Workspace</h1>

      {/* Dados gerais */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Informações da Empresa</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nome da Empresa"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Identificador (slug)
            </label>
            <input
              disabled
              value={workspace?.slug ?? ''}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-400">O identificador não pode ser alterado.</p>
          </div>

          {success && (
            <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">
              Informações atualizadas com sucesso!
            </p>
          )}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <Button type="submit" disabled={loading || !workspace}>
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </div>

      {/* Informações do workspace */}
      {workspace && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Detalhes</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">ID do Workspace</dt>
              <dd className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">
                {workspace.id}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Criado em</dt>
              <dd className="text-gray-700">
                {new Date(workspace.created_at).toLocaleDateString('pt-BR')}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  )
}
