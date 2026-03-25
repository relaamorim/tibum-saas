import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { WorkspaceProvider } from '@/components/workspace-provider'

// Layout principal do dashboard com contexto de workspace
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
