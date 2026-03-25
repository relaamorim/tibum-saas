'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createWorkspace } from '@/services/workspaces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Gera um slug a partir do nome (sem caracteres especiais)
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Formata o número de WhatsApp (mantém apenas dígitos)
function formatWhatsapp(value: string): string {
  return value.replace(/\D/g, '')
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  // Dados da empresa
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)

  // Dados do administrador
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminWhatsapp, setAdminWhatsapp] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleNameChange(value: string) {
    setName(value)
    if (!slugEdited) {
      setSlug(generateSlug(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlug(generateSlug(value))
    setSlugEdited(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !slug || !adminName || !adminEmail) return
    setLoading(true)
    setError('')

    try {
      await createWorkspace(supabase, name, slug, adminName, adminEmail, adminWhatsapp || undefined)
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      if (err?.message?.includes('unique')) {
        setError('Este identificador já está em uso. Escolha outro.')
      } else {
        setError('Erro ao criar empresa. Tente novamente.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-50 to-blue-100">
      <div className="w-full max-w-lg mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏊</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Bem-vindo ao TiBum!</h1>
          <p className="text-gray-500 mt-2">Vamos configurar a sua empresa para começar.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Seção: Dados da Empresa */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Dados da Empresa</h2>
              <p className="text-sm text-gray-500 mb-4">
                Informações da empresa que será criada no sistema.
              </p>
              <div className="space-y-4">
                <Input
                  label="Nome da Empresa *"
                  placeholder="Ex: Piscinas São Paulo"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
                <div>
                  <Input
                    label="Identificador único *"
                    placeholder="piscinas-sao-paulo"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Apenas letras minúsculas, números e hifens. Não pode ser alterado depois.
                  </p>
                </div>
              </div>
            </div>

            {/* Divisor */}
            <div className="border-t border-gray-100" />

            {/* Seção: Dados do Administrador */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Dados do Administrador</h2>
              <p className="text-sm text-gray-500 mb-4">
                Seu nome será exibido na área de membros como nome de usuário.
              </p>
              <div className="space-y-4">
                <Input
                  label="Nome do Administrador *"
                  placeholder="Ex: João Silva"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  required
                />
                <Input
                  label="E-mail do Administrador *"
                  type="email"
                  placeholder="Ex: joao@empresa.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
                <div>
                  <Input
                    label="WhatsApp (opcional)"
                    type="tel"
                    placeholder="Ex: 11999999999"
                    value={adminWhatsapp}
                    onChange={(e) => setAdminWhatsapp(formatWhatsapp(e.target.value))}
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Somente números, com DDD. Ex: 11999999999
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            {/* Plano de teste */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
              <p className="text-sm font-medium text-cyan-800">🎉 14 dias grátis no plano Starter</p>
              <p className="text-xs text-cyan-600 mt-1">Sem cartão de crédito necessário.</p>
            </div>

            <Button
              type="submit"
              disabled={loading || !name || !slug || !adminName || !adminEmail}
              className="w-full"
            >
              {loading ? 'Criando empresa...' : 'Criar Empresa e Começar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
