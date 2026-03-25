'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getSchedules, createSchedule, updateSchedule, deleteSchedule } from '@/services/schedules'
import { getServices, createService, deleteService } from '@/services/services'
import { getCustomers } from '@/services/customers'
import { createPayment } from '@/services/payments'
import { useWorkspace } from '@/components/workspace-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import type { Schedule, Service, Customer, ScheduleStatus, Frequency } from '@/types/database'

// ── Mapeamentos de labels e cores ──────────────────────────────────────────
const statusColors: Record<ScheduleStatus, 'blue' | 'green' | 'red'> = {
  agendado: 'blue',
  concluido: 'green',
  atrasado: 'red',
}

const statusLabels: Record<ScheduleStatus, string> = {
  agendado: 'Agendado',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
}

const frequencyLabels: Record<Frequency, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
}

// Cores das chips no grid do calendário (classes Tailwind)
const chipColors: Record<ScheduleStatus, string> = {
  agendado: 'bg-blue-100 text-blue-700',
  concluido: 'bg-emerald-100 text-emerald-700',
  atrasado: 'bg-red-100 text-red-700',
}

// Cores dos dots na legenda
const dotColors: Record<ScheduleStatus, string> = {
  agendado: 'bg-blue-500',
  concluido: 'bg-emerald-500',
  atrasado: 'bg-red-500',
}

// Nomes dos dias da semana (pt-BR, começando pelo domingo)
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// Nomes dos meses em pt-BR
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// ── Tipo para evento unificado no calendário ───────────────────────────────
type CalendarEvent =
  | { type: 'schedule'; data: Schedule }
  | { type: 'service'; data: Service }

// Converte um objeto Date para string YYYY-MM-DD sem problemas de fuso horário
function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Gera as 42 células (6 semanas × 7 dias) para o grid do calendário
function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0 = domingo

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

  // Preenche com dias do mês anterior para completar a primeira semana
  for (let i = startDow - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
  }

  // Dias do mês atual
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }

  // Dias do próximo mês para completar 42 células
  let nextDay = 1
  while (days.length < 42) {
    days.push({ date: new Date(year, month + 1, nextDay++), isCurrentMonth: false })
  }

  return days
}

// ── Componente principal ───────────────────────────────────────────────────
export default function AgendaPage() {
  const supabase = createClient()
  const { workspace, isAdmin, loading: wsLoading } = useWorkspace()

  // ─ Estado dos dados
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // ─ Navegação do calendário
  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // ─ Controle de abas
  const [activeTab, setActiveTab] = useState<'calendario' | 'lista'>('calendario')

  // ─ Filtro da aba lista
  const [filterStatus, setFilterStatus] = useState('')

  // ─ Modal: Novo Agendamento
  const [modalAgendamento, setModalAgendamento] = useState(false)
  const [savingAgendamento, setSavingAgendamento] = useState(false)
  const [formAgendamento, setFormAgendamento] = useState({
    customer_id: '',
    date: '',
    frequency: 'semanal' as Frequency,
    status: 'agendado' as ScheduleStatus,
    notes: '',
  })

  // ─ Modal: Novo Serviço
  const [modalServico, setModalServico] = useState(false)
  const [savingServico, setSavingServico] = useState(false)
  const [formServico, setFormServico] = useState({
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    products_used: '',
    photo_url: '',
    amount: '',
  })

  // Carrega todos os dados ao montar ou trocar de workspace
  useEffect(() => {
    if (!wsLoading) loadData()
  }, [workspace, wsLoading])

  async function loadData() {
    try {
      // Carrega agendamentos, serviços e clientes em paralelo
      const [schedulesData, servicesData, customersData] = await Promise.all([
        getSchedules(supabase, undefined, workspace?.id),
        getServices(supabase, workspace?.id),
        getCustomers(supabase, workspace?.id),
      ])
      setSchedules(schedulesData)
      setServices(servicesData)
      setCustomers(customersData)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── Mapa de eventos por data YYYY-MM-DD → CalendarEvent[] ────────────────
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    for (const s of schedules) {
      if (!map.has(s.date)) map.set(s.date, [])
      map.get(s.date)!.push({ type: 'schedule', data: s })
    }

    for (const sv of services) {
      if (!map.has(sv.date)) map.set(sv.date, [])
      map.get(sv.date)!.push({ type: 'service', data: sv })
    }

    return map
  }, [schedules, services])

  // Eventos do dia selecionado para o painel de detalhes
  const selectedDayEvents = selectedDay ? (eventsByDate.get(selectedDay) ?? []) : []

  // ── Ações de Agendamento ──────────────────────────────────────────────────
  async function handleSaveAgendamento(e: React.FormEvent) {
    e.preventDefault()
    setSavingAgendamento(true)
    try {
      await createSchedule(supabase, {
        customer_id: formAgendamento.customer_id,
        date: formAgendamento.date,
        frequency: formAgendamento.frequency,
        status: formAgendamento.status,
        notes: formAgendamento.notes || null,
      }, workspace?.id)

      setModalAgendamento(false)
      // Navega o calendário para o mês do novo agendamento e seleciona o dia
      if (formAgendamento.date) {
        const d = new Date(formAgendamento.date + 'T12:00:00')
        setCalYear(d.getFullYear())
        setCalMonth(d.getMonth())
        setSelectedDay(formAgendamento.date)
        setActiveTab('calendario')
      }
      await loadData()
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err)
    } finally {
      setSavingAgendamento(false)
    }
  }

  async function handleComplete(schedule: Schedule) {
    try {
      await updateSchedule(supabase, schedule.id, { status: 'concluido' }, workspace?.id)
      // Cria automaticamente um serviço vinculado ao agendamento
      await createService(supabase, {
        customer_id: schedule.customer_id,
        schedule_id: schedule.id,
        date: new Date().toISOString().split('T')[0],
        notes: `Serviço concluído - agendamento ${schedule.date}`,
        products_used: null,
        photo_url: null,
      }, workspace?.id)
      await loadData()
    } catch (err) {
      console.error('Erro ao concluir agendamento:', err)
    }
  }

  async function handleDeleteSchedule(id: string) {
    if (!confirm('Excluir este agendamento?')) return
    try {
      await deleteSchedule(supabase, id, workspace?.id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir agendamento:', err)
    }
  }

  // ── Ações de Serviço ──────────────────────────────────────────────────────
  async function handleSaveServico(e: React.FormEvent) {
    e.preventDefault()
    setSavingServico(true)
    try {
      const service = await createService(supabase, {
        customer_id: formServico.customer_id,
        date: formServico.date,
        notes: formServico.notes || null,
        products_used: formServico.products_used || null,
        photo_url: formServico.photo_url || null,
        schedule_id: null,
      }, workspace?.id)

      // Cria pagamento pendente se valor informado
      if (formServico.amount && Number(formServico.amount) > 0) {
        await createPayment(supabase, {
          service_id: service.id,
          amount: Number(formServico.amount),
          status: 'pendente',
          paid_at: null,
        }, workspace?.id)
      }

      setModalServico(false)
      // Navega o calendário para o mês do novo serviço e seleciona o dia
      if (formServico.date) {
        const d = new Date(formServico.date + 'T12:00:00')
        setCalYear(d.getFullYear())
        setCalMonth(d.getMonth())
        setSelectedDay(formServico.date)
        setActiveTab('calendario')
      }
      await loadData()
    } catch (err) {
      console.error('Erro ao salvar serviço:', err)
    } finally {
      setSavingServico(false)
    }
  }

  async function handleDeleteService(id: string) {
    if (!confirm('Excluir este registro de serviço?')) return
    try {
      await deleteService(supabase, id, workspace?.id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir serviço:', err)
    }
  }

  const customerOptions = [
    { value: '', label: 'Selecione o cliente...' },
    ...customers.map((c) => ({ value: c.id, label: c.name })),
  ]

  // Grid e data de hoje para o calendário
  const calendarDays = getCalendarDays(calYear, calMonth)
  const todayStr = toDateStr(today)

  // Agendamentos filtrados para a aba lista (filtro em memória)
  const filteredSchedules = filterStatus
    ? schedules.filter((s) => s.status === filterStatus)
    : schedules

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Cabeçalho: título + botões de criar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => {
            setFormAgendamento({ customer_id: '', date: '', frequency: 'semanal', status: 'agendado', notes: '' })
            setModalAgendamento(true)
          }}>
            + Agendamento
          </Button>
          <Button variant="secondary" onClick={() => {
            setFormServico({ customer_id: '', date: new Date().toISOString().split('T')[0], notes: '', products_used: '', photo_url: '', amount: '' })
            setModalServico(true)
          }}>
            + Serviço
          </Button>
        </div>
      </div>

      {/* Abas: Calendário | Lista */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          { id: 'calendario', label: 'Calendário' },
          { id: 'lista', label: 'Lista' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px
              ${activeTab === tab.id
                ? 'border-cyan-600 text-cyan-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Carregando...</p>
      ) : (
        <>
          {/* ═══════════════════════════════════════════
              ABA CALENDÁRIO
          ═══════════════════════════════════════════ */}
          {activeTab === 'calendario' && (
            <div className="space-y-4">

              {/* Legenda de cores */}
              <div className="flex gap-5 flex-wrap text-xs text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  Agendado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  Atrasado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Concluído
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  Serviço
                </span>
              </div>

              {/* Grid do calendário */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Navegação: mês anterior / título / próximo mês */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <button
                    onClick={() => {
                      if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
                      else setCalMonth(m => m - 1)
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 text-xl font-bold"
                  >
                    ‹
                  </button>
                  <h2 className="text-base font-semibold text-gray-800">
                    {MONTHS[calMonth]} {calYear}
                  </h2>
                  <button
                    onClick={() => {
                      if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
                      else setCalMonth(m => m + 1)
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-600 text-xl font-bold"
                  >
                    ›
                  </button>
                </div>

                {/* Cabeçalho dos dias da semana */}
                <div className="grid grid-cols-7 border-b border-gray-100">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2 uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Células do calendário */}
                <div className="grid grid-cols-7">
                  {calendarDays.map(({ date, isCurrentMonth }, idx) => {
                    const dateStr = toDateStr(date)
                    const events = eventsByDate.get(dateStr) ?? []
                    const isToday = dateStr === todayStr
                    const isSelected = dateStr === selectedDay
                    const hasEvents = events.length > 0

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                        className={`
                          min-h-[76px] p-1.5 text-left border-b border-r border-gray-100
                          transition-colors
                          ${isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/60'}
                          ${isSelected ? 'ring-2 ring-inset ring-cyan-500 bg-cyan-50' : ''}
                        `}
                      >
                        {/* Número do dia */}
                        <span className={`
                          text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1
                          ${isToday
                            ? 'bg-cyan-600 text-white'
                            : isCurrentMonth
                              ? 'text-gray-700'
                              : 'text-gray-300'
                          }
                          ${hasEvents && !isToday && isCurrentMonth ? 'font-bold' : ''}
                        `}>
                          {date.getDate()}
                        </span>

                        {/* Chips dos eventos (máximo 3 visíveis) */}
                        <div className="space-y-0.5">
                          {events.slice(0, 3).map((ev, i) => {
                            if (ev.type === 'schedule') {
                              return (
                                <div
                                  key={i}
                                  className={`text-[10px] px-1 py-0.5 rounded truncate font-medium leading-tight ${chipColors[ev.data.status]}`}
                                >
                                  {ev.data.customer?.name?.split(' ')[0] ?? 'Cliente'}
                                </div>
                              )
                            }
                            return (
                              <div
                                key={i}
                                className="text-[10px] px-1 py-0.5 rounded truncate font-medium leading-tight bg-amber-100 text-amber-700"
                              >
                                ✓ {ev.data.customer?.name?.split(' ')[0] ?? 'Serviço'}
                              </div>
                            )
                          })}

                          {/* Indicador de mais eventos */}
                          {events.length > 3 && (
                            <div className="text-[10px] text-gray-400 pl-1 font-medium">
                              +{events.length - 3} mais
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Painel de detalhes do dia selecionado */}
              {selectedDay && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 capitalize">
                      {new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                      })}
                      <span className="ml-2 text-gray-400 font-normal text-xs">
                        {selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''}
                      </span>
                    </h3>
                    <button
                      onClick={() => setSelectedDay(null)}
                      className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  </div>

                  {selectedDayEvents.length === 0 ? (
                    <p className="text-sm text-gray-400 py-2">Nenhum evento registrado para este dia.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedDayEvents.map((ev, i) => {
                        // ─ Card de Agendamento
                        if (ev.type === 'schedule') {
                          const s = ev.data
                          return (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[s.status]}`} />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{s.customer?.name}</p>
                                  <p className="text-xs text-gray-500">
                                    Agendamento · {frequencyLabels[s.frequency]}
                                    {s.notes && ` · ${s.notes}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Badge color={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                                {s.status === 'agendado' && (
                                  <Button variant="ghost" size="sm" onClick={() => handleComplete(s)}>
                                    Concluir
                                  </Button>
                                )}
                                {isAdmin && (
                                  <Button variant="danger" size="sm" onClick={() => handleDeleteSchedule(s.id)}>
                                    Excluir
                                  </Button>
                                )}
                              </div>
                            </div>
                          )
                        }

                        // ─ Card de Serviço
                        const sv = ev.data
                        return (
                          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100 gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-500" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{sv.customer?.name}</p>
                                <p className="text-xs text-gray-500">
                                  Serviço realizado
                                  {sv.products_used && ` · ${sv.products_used}`}
                                  {sv.notes && ` · ${sv.notes}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge color="yellow">Serviço</Badge>
                              {isAdmin && (
                                <Button variant="danger" size="sm" onClick={() => handleDeleteService(sv.id)}>
                                  Excluir
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════
              ABA LISTA (agendamentos apenas)
          ═══════════════════════════════════════════ */}
          {activeTab === 'lista' && (
            <div className="space-y-4">
              {/* Filtros de status */}
              <div className="flex gap-2 flex-wrap">
                {(['', 'agendado', 'concluido', 'atrasado'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${filterStatus === s
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    {s === '' ? 'Todos' : statusLabels[s]}
                  </button>
                ))}
              </div>

              {filteredSchedules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum agendamento encontrado.</p>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="text-left px-6 py-3 font-medium">Cliente</th>
                          <th className="text-left px-6 py-3 font-medium">Data</th>
                          <th className="text-left px-6 py-3 font-medium hidden sm:table-cell">Frequência</th>
                          <th className="text-left px-6 py-3 font-medium">Status</th>
                          <th className="text-right px-6 py-3 font-medium">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredSchedules.map((s) => (
                          <tr
                            key={s.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              // Clique na linha vai para o calendário naquele dia
                              setCalYear(new Date(s.date + 'T12:00:00').getFullYear())
                              setCalMonth(new Date(s.date + 'T12:00:00').getMonth())
                              setSelectedDay(s.date)
                              setActiveTab('calendario')
                            }}
                          >
                            <td className="px-6 py-4 font-medium text-gray-900">{s.customer?.name}</td>
                            <td className="px-6 py-4 text-gray-700">
                              {new Date(s.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <Badge color="gray">{frequencyLabels[s.frequency]}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <Badge color={statusColors[s.status]}>{statusLabels[s.status]}</Badge>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                              {s.status === 'agendado' && (
                                <Button variant="ghost" size="sm" onClick={() => handleComplete(s)}>
                                  Concluir
                                </Button>
                              )}
                              {isAdmin && (
                                <Button variant="danger" size="sm" onClick={() => handleDeleteSchedule(s.id)}>
                                  Excluir
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Modal: Novo Agendamento ────────────────────────────────────────── */}
      <Modal open={modalAgendamento} onClose={() => setModalAgendamento(false)} title="Novo Agendamento">
        <form onSubmit={handleSaveAgendamento} className="space-y-4">
          <Select
            label="Cliente *"
            options={customerOptions}
            value={formAgendamento.customer_id}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, customer_id: e.target.value })}
            required
          />
          <Input
            label="Data *"
            type="date"
            value={formAgendamento.date}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, date: e.target.value })}
            required
          />
          <Select
            label="Frequência"
            options={[
              { value: 'semanal', label: 'Semanal' },
              { value: 'quinzenal', label: 'Quinzenal' },
              { value: 'mensal', label: 'Mensal' },
            ]}
            value={formAgendamento.frequency}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, frequency: e.target.value as Frequency })}
          />
          <Input
            label="Observações"
            value={formAgendamento.notes}
            onChange={(e) => setFormAgendamento({ ...formAgendamento, notes: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={savingAgendamento}>
              {savingAgendamento ? 'Salvando...' : 'Criar Agendamento'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalAgendamento(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Novo Serviço ────────────────────────────────────────────── */}
      <Modal open={modalServico} onClose={() => setModalServico(false)} title="Registrar Serviço">
        <form onSubmit={handleSaveServico} className="space-y-4">
          <Select
            label="Cliente *"
            options={customerOptions}
            value={formServico.customer_id}
            onChange={(e) => setFormServico({ ...formServico, customer_id: e.target.value })}
            required
          />
          <Input
            label="Data *"
            type="date"
            value={formServico.date}
            onChange={(e) => setFormServico({ ...formServico, date: e.target.value })}
            required
          />
          <Input
            label="Observações"
            value={formServico.notes}
            onChange={(e) => setFormServico({ ...formServico, notes: e.target.value })}
          />
          <Input
            label="Produtos Utilizados"
            value={formServico.products_used}
            onChange={(e) => setFormServico({ ...formServico, products_used: e.target.value })}
            placeholder="Ex: cloro, algicida, barrilha"
          />
          <Input
            label="URL da Foto (opcional)"
            value={formServico.photo_url}
            onChange={(e) => setFormServico({ ...formServico, photo_url: e.target.value })}
            placeholder="https://..."
          />
          <Input
            label="Valor do Serviço (R$)"
            type="number"
            step="0.01"
            min="0"
            value={formServico.amount}
            onChange={(e) => setFormServico({ ...formServico, amount: e.target.value })}
            placeholder="0.00"
          />
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={savingServico}>
              {savingServico ? 'Salvando...' : 'Registrar'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setModalServico(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
