'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { api } from '@/trpc/react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, Sparkles, Loader2, Receipt } from 'lucide-react'
import { createCheckoutSession } from '@/lib/stripe'
import { toast } from 'sonner'

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin" /></div>}>
      <BillingContent />
    </Suspense>
  )
}

function BillingContent() {
  const [credits, setCredits] = useState(100)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const verifiedRef = useRef(false)

  const { data: userCredits, isLoading: creditsLoading, refetch: refetchCredits } = api.project.getMyCredits.useQuery()
  const { data: transactions, isLoading: txLoading, refetch: refetchTransactions } = api.project.getMyTransactions.useQuery()
  const verifyPayment = api.project.verifyPayment.useMutation()

  // Verify payment when returning from Stripe checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const success = searchParams.get('success')

    if (success === 'true' && sessionId && !verifiedRef.current) {
      verifiedRef.current = true
      verifyPayment.mutateAsync({ sessionId })
        .then((result) => {
          if (result.status === 'success') {
            toast.success(`Successfully added ${result.credits} credits!`)
          } else {
            toast.success('Payment already processed!')
          }
          refetchCredits()
          refetchTransactions()
          // Clean up URL params
          router.replace('/billing')
        })
        .catch(() => {
          // Webhook may have already processed it — just refetch
          refetchCredits()
          refetchTransactions()
          router.replace('/billing')
        })
    }
  }, [searchParams])

  const price = Math.round((credits / 50) * 100) / 100

  const handlePurchase = async () => {
    setIsRedirecting(true)
    try {
      await createCheckoutSession(credits)
    } catch (error: any) {
      // Next.js redirect() throws a NEXT_REDIRECT error — that's expected, not a failure
      if (error?.digest?.startsWith('NEXT_REDIRECT')) return
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout. Please try again.')
      setIsRedirecting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your credits and billing history
        </p>
      </div>

      {/* Current Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            Current Credits
          </CardTitle>
          <CardDescription>
            Credits are used for project creation and AI queries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creditsLoading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-gray-900">{userCredits ?? 0}</span>
              <span className="text-muted-foreground">credits remaining</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            New accounts start with 10,000 free credits. Each file indexed = 1 credit.
          </p>
        </CardContent>
      </Card>

      {/* Purchase Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Purchase Credits
          </CardTitle>
          <CardDescription>
            Purchase additional credits to continue using GitMind
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Credits to purchase</span>
              <span className="text-lg font-bold text-emerald-600">{credits} credits</span>
            </div>
            <Slider
              min={10}
              max={1000}
              step={10}
              value={[credits]}
              onValueChange={([val]) => setCredits(val ?? 10)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10 credits</span>
              <span>1000 credits</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>{credits} credits</span>
              <span>${price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t pt-2">
              <span>Total</span>
              <span>${price.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handlePurchase}
            disabled={isRedirecting}
            className="w-full"
            size="lg"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Purchase {credits} Credits for ${price.toFixed(2)}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-500" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No transactions yet. Purchase credits to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">+{tx.credits} credits</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                    Purchased
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
