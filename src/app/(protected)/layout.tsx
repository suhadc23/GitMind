import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 min-h-screen bg-gray-50 overflow-x-hidden">
        <div className="flex items-center gap-2 p-2 border-b bg-white sticky top-0 z-10">
          <SidebarTrigger />
        </div>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </SidebarProvider>
  )
}
