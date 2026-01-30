'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedSectionProps {
  children: React.ReactNode
  className?: string
  animation?: 'fade-in' | 'slide-in-right' | 'float'
}

export function AnimatedSection({ 
  children, 
  className, 
  animation = 'fade-in' 
}: AnimatedSectionProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [])

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700',
        isVisible ? 'opacity-100' : 'opacity-0',
        isVisible && animation === 'fade-in' && 'animate-fade-in',
        isVisible && animation === 'slide-in-right' && 'animate-slide-in-right',
        isVisible && animation === 'float' && 'animate-float',
        className
      )}
    >
      {children}
    </div>
  )
}
