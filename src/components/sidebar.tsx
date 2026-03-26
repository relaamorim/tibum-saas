'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useWorkspace } from './workspace-provider'
import { Badge } from './ui/badge'

// Itens de navegação principal
const mainMenu = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/agenda', label: 'Agenda', icon: '📅' },
  { href: '/servicos', label: 'Serviços', icon: '🔧' },
  { href: '/financeiro', label: 'Financeiro', icon: '💰' },
  { href: '/estoque', label: 'Estoque', icon: '📦' },
]

// Itens de configuração (apenas para admins)
const adminMenu = [
  { href: '/configuracoes', label: 'Workspace', icon: '🏢' },
  { href: '/configuracoes/membros', label: 'Membros', icon: '👤' },
  { href: '/configuracoes/plano', label: 'Plano', icon: '⭐' },
  { href: '/configuracoes/auditoria', label: 'Auditoria', icon: '📋' },
]

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  technician: 'Técnico',
}

export function Sidebar() {
  const pathname = usePathname()
  const { workspace, role, plan, loading, isAdmin } = useWorkspace()
  const [collapsed, setCollapsed] = useState(false)

  function isActive(href: string) {
    if (href === '/configuracoes') {
      return pathname === '/configuracoes'
    }
    return pathname.startsWith(href) && (pathname === href || pathname.startsWith(href + '/'))
  }

  return (
    <>
      {/* Botão hamburguer para mobile */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white rounded-lg p-2 shadow-md"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {collapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay para mobile */}
      {collapsed && (
        <div className="lg:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setCollapsed(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out flex flex-col
          ${collapsed ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo + Workspace */}
        <div className="px-5 py-5 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white text-xl">🏊</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">TiBum</h1>
              <p className="text-xs text-gray-400">Gestão de Piscinas</p>
            </div>
          </div>
          {/* Nome do workspace */}
          {!loading && workspace && (
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-500 leading-none mb-1">Empresa</p>
              <p className="text-sm font-medium text-gray-800 truncate">{workspace.name}</p>
              <div className="flex items-center gap-2 mt-1">
                {role && (
                  <Badge color={role === 'admin' ? 'blue' : 'gray'}>
                    {roleLabels[role]}
                  </Badge>
                )}
                {plan && (
                  <span className="text-xs text-gray-400">{plan.name}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Menu principal */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {mainMenu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setCollapsed(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                ${isActive(item.href)
                  ? 'bg-cyan-50 text-cyan-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Seção de administração (apenas admins) */}
          {isAdmin && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Administração
                </p>
              </div>
              {adminMenu.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setCollapsed(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive(item.href)
                      ? 'bg-cyan-50 text-cyan-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>
      </aside>
    </>
  )
}
