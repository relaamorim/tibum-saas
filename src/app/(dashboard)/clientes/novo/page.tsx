'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createCustomer, getCustomer, updateCustomer } from '@/services/customers'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Representa um campo dinâmico com nome e valor
interface CustomField {
  key: string
  value: string
}

function NovoClienteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  const supabase = createClient()
  const { workspace } = useWorkspace()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', address: '' })

  // Campos dinâmicos: lista de pares { chave, valor }
  const [customFields, setCustomFields] = useState<CustomField[]>([])

  // Fotos: arquivos novos selecionados pelo usuário
  const [newFiles, setNewFiles] = useState<File[]>([])
  // URLs de preview local para exibir antes de salvar
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  // URLs já salvas no banco (modo edição)
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])

  // Carrega dados do cliente no modo edição
  useEffect(() => {
    if (editId) {
      getCustomer(supabase, editId).then((c) => {
        setForm({
          name: c.name,
          phone: c.phone || '',
          address: c.address || '',
        })
        // Carrega campos dinâmicos do banco
        if (c.custom_fields && Object.keys(c.custom_fields).length > 0) {
          const fields = Object.entries(c.custom_fields).map(([key, value]) => ({ key, value: String(value) }))
          setCustomFields(fields)
        }
        // Carrega fotos já salvas
        if (c.photos && c.photos.length > 0) {
          setExistingPhotos(c.photos)
        }
      })
    }
  }, [editId])

  // Atualiza previews sempre que novos arquivos são selecionados
  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    // Limpa as URLs de objeto quando o componente desmonta
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [newFiles])

  // ── Funções dos campos dinâmicos ──────────────────────

  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: '', value: '' }])
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index))
  }

  function updateField(index: number, prop: 'key' | 'value', val: string) {
    setCustomFields((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [prop]: val }
      return updated
    })
  }

  // ── Funções de upload de fotos ────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setNewFiles((prev) => [...prev, ...files])
      // Limpa o input para permitir selecionar o mesmo arquivo novamente
      e.target.value = ''
    }
  }

  function removeNewFile(index: number) {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExistingPhoto(url: string) {
    setExistingPhotos((prev) => prev.filter((p) => p !== url))
  }

  // Faz upload dos arquivos para o Supabase Storage e retorna as URLs públicas
  async function uploadPhotos(customerId: string, files: File[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const ext = file.name.split('.').pop() || 'jpg'
      // Organiza arquivos por workspace/cliente para facilitar gerenciamento
      const path = `${workspace?.id}/${customerId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage
        .from('customer-photos')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (!error) {
        const { data } = supabase.storage.from('customer-photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    return urls
  }

  // ── Submit do formulário ──────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      // Converte a lista de campos dinâmicos para objeto JSON
      // Ex: [{ key: "Tipo", value: "Fibra" }] → { "Tipo": "Fibra" }
      const customFieldsObj = customFields.reduce<Record<string, string>>((acc, f) => {
        if (f.key.trim()) acc[f.key.trim()] = f.value
        return acc
      }, {})

      const baseData = {
        name: form.name,
        phone: form.phone || null,
        address: form.address || null,
        pool_type: null,   // campos antigos — substituídos por custom_fields
        pool_size: null,
        custom_fields: Object.keys(customFieldsObj).length > 0 ? customFieldsObj : null,
        photos: existingPhotos,  // fotos já salvas (pode ter sido removida alguma)
      }

      if (editId) {
        // Atualiza dados básicos
        await updateCustomer(supabase, editId, baseData, workspace?.id)
        // Faz upload e salva URLs das novas fotos
        if (newFiles.length > 0) {
          const newUrls = await uploadPhotos(editId, newFiles)
          const allPhotos = [...existingPhotos, ...newUrls]
          await updateCustomer(supabase, editId, { photos: allPhotos }, workspace?.id)
        }
      } else {
        // Cria o cliente primeiro para obter o ID
        const customer = await createCustomer(supabase, baseData, workspace?.id)
        // Depois faz o upload das fotos usando o ID gerado
        if (newFiles.length > 0) {
          const photoUrls = await uploadPhotos(customer.id, newFiles)
          await updateCustomer(supabase, customer.id, { photos: photoUrls }, workspace?.id)
        }
      }

      router.push('/clientes')
    } catch (err) {
      console.error('Erro ao salvar cliente:', err)
      alert('Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {editId ? 'Editar Cliente' : 'Novo Cliente'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">

        {/* ── Dados básicos ─────────────────────────────── */}
        <Input
          label="Nome *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <Input
          label="Telefone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="(11) 99999-9999"
        />
        <Input
          label="Endereço"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />

        {/* ── Características da Piscina (campos dinâmicos) ─ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Características da Piscina
            </label>
            <button
              type="button"
              onClick={addCustomField}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              <span className="text-xl leading-none font-bold">+</span>
              <span>Adicionar</span>
            </button>
          </div>

          {/* Mensagem quando não há campos */}
          {customFields.length === 0 && (
            <p className="text-sm text-gray-400 italic py-2">
              Clique em &quot;+ Adicionar&quot; para inserir características como tipo, volume, dimensões, produto utilizado, etc.
            </p>
          )}

          {/* Lista de campos dinâmicos */}
          <div className="space-y-2">
            {customFields.map((field, i) => (
              <div key={i} className="flex gap-2 items-center">
                {/* Nome da característica */}
                <input
                  type="text"
                  placeholder="Nome (ex: Tipo)"
                  value={field.key}
                  onChange={(e) => updateField(i, 'key', e.target.value)}
                  className="w-2/5 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Valor da característica */}
                <input
                  type="text"
                  placeholder="Valor (ex: Fibra)"
                  value={field.value}
                  onChange={(e) => updateField(i, 'value', e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {/* Botão remover */}
                <button
                  type="button"
                  onClick={() => removeCustomField(i)}
                  title="Remover campo"
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xl font-bold"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upload de Fotos ───────────────────────────── */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Fotos</label>

          {/* Área clicável para selecionar arquivos */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <div className="text-4xl mb-2">📷</div>
            <div className="text-sm font-medium text-gray-600">Clique para adicionar fotos</div>
            <div className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP — você pode selecionar múltiplos arquivos</div>
          </button>

          {/* Input de arquivo oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Fotos já salvas no banco (modo edição) */}
          {existingPhotos.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">Fotos salvas ({existingPhotos.length}):</p>
              <div className="grid grid-cols-4 gap-2">
                {existingPhotos.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Foto ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200"
                    />
                    {/* Botão de remover aparece no hover */}
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(url)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover foto"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview das novas fotos selecionadas */}
          {previewUrls.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2 font-medium">
                Novas fotos para upload ({previewUrls.length}):
              </p>
              <div className="grid grid-cols-4 gap-2">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Nova foto ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg border-2 border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewFile(i)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remover foto"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Botões de ação ────────────────────────────── */}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : editId ? 'Atualizar' : 'Cadastrar'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push('/clientes')}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NovoClientePage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Carregando...</div>}>
      <NovoClienteForm />
    </Suspense>
  )
}
