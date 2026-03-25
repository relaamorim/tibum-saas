'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  getWorkspaceMembers,
  updateMemberRole,
  removeMember,
  checkMemberLimit,
} from '@/services/workspaces'
import { logAudit } from '@/services/audit'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import type { WorkspaceMember } from '@/types/database'

export default function MembrosPage() {
  const supabase = createClient()
  const { workspace } = useWorkspace()
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  // Campos do formulário de convite
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'technician'>('technician')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const [limitInfo, setLimitInfo] = useState<{ allowed: boolean; current: number; max: number | null } | null>(null)

  useEffect(() => {
    if (workspace) loadData()
  }, [workspace])

  async function loadData() {
    if (!workspace) return
    try {
      const [membersData, limit] = await Promise.all([
        getWorkspaceMembers(supabase, workspace.id),
        checkMemberLimit(supabase, workspace.id),
      ])
      setMembers(membersData)
      setLimitInfo(limit)
    } catch (err) {
      console.error('Erro ao carregar membros:', err)
    } finally {
      setLoading(false)
    }
  }

  function openModal() {
    setInviteName('')
    setInviteEmail('')
    setInviteRole('technician')
    setError('')
    setSuccessMsg('')
    setModalOpen(true)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!workspace) return
    setSaving(true)
    setError('')
    setSuccessMsg('')

    try {
      // Chama a API de convite — cria a conta Supabase e envia email ao técnico
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inviteName,
          email: inviteEmail,
          role: inviteRole,
          workspace_id: workspace.id,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Erro ao convidar membro.')
        return
      }

      // Registra na auditoria
      await logAudit(supabase, {
        workspaceId: workspace.id,
        action: 'invite',
        resourceType: 'member',
        resourceId: json.member?.id,
        newData: { name: inviteName, email: inviteEmail, role: inviteRole },
      })

      setSuccessMsg(`Convite enviado para ${inviteEmail}! ${inviteName} receberá um email com o link de acesso.`)
      loadData()
    } catch {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleChange(member: WorkspaceMember, role: 'admin' | 'technician') {
    if (!workspace) return
    try {
      await updateMemberRole(supabase, member.id, role)
      await logAudit(supabase, {
        workspaceId: workspace.id,
        action: 'role_change',
        resourceType: 'member',
        resourceId: member.id,
        oldData: { role: member.role },
        newData: { role },
      })
      loadData()
    } catch {
      console.error('Erro ao atualizar função')
    }
  }

  async function handleRemove(member: WorkspaceMember) {
    if (!workspace) return
    if (!confirm(`Remover ${member.name ?? member.user_id} do workspace?`)) return
    try {
      await removeMember(supabase, member.id)
      await logAudit(supabase, {
        workspaceId: workspace.id,
        action: 'delete',
        resourceType: 'member',
        resourceId: member.id,
        oldData: { user_id: member.user_id, role: member.role },
      })
      loadData()
    } catch {
      console.error('Erro ao remover membro')
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Membros da Equipe</h1>
        <Button
          onClick={openModal}
          disabled={limitInfo !== null && !limitInfo.allowed}
        >
          + Adicionar Membro
        </Button>
      </div>

      {/* Limite de membros */}
      {limitInfo && (
        <div className="text-sm text-gray-500">
          {limitInfo.current} de {limitInfo.max ?? '∞'} membros utilizados
          {!limitInfo.allowed && (
            <span className="ml-2 text-amber-600 font-medium">
              — Limite atingido. <a href="/configuracoes/plano" className="underline">Faça upgrade</a>
            </span>
          )}
        </div>
      )}

      {/* Lista de membros */}
      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Nome</th>
                  <th className="text-left px-6 py-3 font-medium">Função</th>
                  <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Desde</th>
                  <th className="text-right px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {m.name ? (
                        <span className="text-sm font-medium text-gray-800">{m.name}</span>
                      ) : (
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {m.user_id.slice(0, 16)}…
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={m.role === 'admin' ? 'blue' : 'gray'}>
                        {m.role === 'admin' ? 'Admin' : 'Técnico'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-500 hidden sm:table-cell">
                      {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRoleChange(m, m.role === 'admin' ? 'technician' : 'admin')}
                      >
                        {m.role === 'admin' ? 'Tornar Técnico' : 'Tornar Admin'}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleRemove(m)}>
                        Remover
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de convite */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Adicionar Membro">
        {/* Se o convite foi enviado com sucesso, mostra mensagem e botão de fechar */}
        {successMsg ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-700 font-medium">Convite enviado!</p>
              <p className="text-sm text-emerald-600 mt-1">{successMsg}</p>
            </div>
            <p className="text-xs text-gray-500">
              O membro receberá um email com um link para acessar o sistema.
              Ele precisará criar uma senha no primeiro acesso.
            </p>
            <div className="flex gap-3 pt-1">
              <Button onClick={() => { setSuccessMsg(''); setModalOpen(false) }}>
                Fechar
              </Button>
              <Button variant="secondary" onClick={() => setSuccessMsg('')}>
                Convidar outro
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <Input
              label="Nome completo *"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Ex: João Silva"
              required
            />
            <Input
              label="Email *"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
            <Select
              label="Função"
              options={[
                { value: 'technician', label: 'Técnico' },
                { value: 'admin', label: 'Admin' },
              ]}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'technician')}
            />
            <p className="text-xs text-gray-400 -mt-1">
              O membro receberá um email com o link de acesso. Não é necessário que ele tenha conta prévia.
            </p>
            {error && <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Enviando convite...' : 'Enviar convite'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
