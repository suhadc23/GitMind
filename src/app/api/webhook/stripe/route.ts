import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: import('stripe').Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as import('stripe').Stripe.Checkout.Session
    const userId = session.metadata?.userId
    const credits = parseInt(session.metadata?.credits ?? '0')

    if (userId && credits > 0) {
      // Prevent double-crediting: check if this session was already processed
      const existing = await db.stripeTransaction.findUnique({
        where: { stripeSessionId: session.id },
      })
      if (!existing) {
        await db.user.update({
          where: { id: userId },
          data: { credits: { increment: credits } },
        })

        await db.stripeTransaction.create({
          data: { userId, credits, stripeSessionId: session.id },
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
