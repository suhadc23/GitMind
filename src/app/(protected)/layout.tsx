'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { DashboardNav } from '@/components/layout/DashboardNav'
import { cn } from '@/lib/utils'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        <DashboardNav
          onMenuClick={() => setIsMobileOpen(true)}
          userCredits={150}
        />

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
