import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import { TRPCReactProvider } from '@/trpc/react'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'GitMind - AI-Powered Repository Intelligence',
  description: 'Understand your codebase with AI-powered natural language queries and insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body style={{ fontFamily: "'Inter', sans-serif" }}>
          <TRPCReactProvider>
            {children}
          </TRPCReactProvider>
          <Toaster richColors />
        </body>
      </html>
    </ClerkProvider>
  )
}
