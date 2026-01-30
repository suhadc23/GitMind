import React from 'react'
import { cn } from '@/lib/utils'

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  children: React.ReactNode
}

export function GradientButton({ 
  variant = 'primary', 
  className, 
  children, 
  ...props 
}: GradientButtonProps) {
  return (
    <button
      className={cn(
        'px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg',
        variant === 'primary' && 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-emerald-500/50',
        variant === 'secondary' && 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-amber-500/50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
