import React from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function GlassCard({ children, className, hover = true }: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-6 shadow-xl',
        hover && 'transition-all duration-300 hover:scale-105 hover:shadow-2xl',
        className
      )}
    >
      {children}
    </div>
  )
}
