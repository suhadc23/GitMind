'use client'

import { UserButton, useUser } from '@clerk/nextjs'
import { Menu, Sparkles } from 'lucide-react'

interface DashboardNavProps {
  onMenuClick: () => void
  userCredits?: number
}

export function DashboardNav({ onMenuClick, userCredits = 150 }: DashboardNavProps) {
  const { user } = useUser()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Menu className="h-6 w-6 text-gray-600" />
      </button>

      {/* Center - Page title (optional, can be customized per page) */}
      <div className="flex-1 lg:ml-0 ml-4">
        <h1 className="text-xl font-semibold text-gray-800">
          {/* This will be overridden by page content */}
        </h1>
      </div>

      {/* Right side - Credits and User */}
      <div className="flex items-center space-x-4">
        {/* Credits Display */}
        <div className="hidden sm:flex items-center space-x-2 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 rounded-lg border border-emerald-200">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <div className="flex flex-col">
            <span className="text-xs text-gray-600 font-medium">Credits</span>
            <span className="text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {userCredits}
            </span>
          </div>
        </div>

        {/* User Button */}
        <div className="flex items-center space-x-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-gray-800">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {user?.emailAddresses[0]?.emailAddress}
            </p>
          </div>
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-10 w-10 ring-2 ring-emerald-500 ring-offset-2',
              },
            }}
          />
        </div>
      </div>
    </header>
  )
}
