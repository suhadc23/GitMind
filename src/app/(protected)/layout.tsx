'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
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
  const [userCredits, setUserCredits] = useState<number>(150)
  const { user } = useUser()

  // Fetch user credits on mount and periodically
  useEffect(() => {
    async function fetchCredits() {
      if (!user?.id) return

      try {
        const response = await fetch('/api/user/credits')
        const data = await response.json()

        if (response.ok && data.credits !== undefined) {
          setUserCredits(data.credits)
        }
      } catch (error) {
        console.error('Error fetching credits:', error)
      }
    }

    fetchCredits()

    // Refresh credits every 30 seconds
    const interval = setInterval(fetchCredits, 30000)

    return () => clearInterval(interval)
  }, [user?.id])

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
          userCredits={userCredits}
        />

        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
