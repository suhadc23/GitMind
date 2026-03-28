'use server'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export async function createCheckoutSession(credits: number) {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')

  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment.')
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
  })

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${credits} GitMind Credits`,
            description: `Purchase ${credits} credits for AI-powered repository analysis`,
          },
          unit_amount: Math.round((credits / 50) * 100), // $2 per 100 credits
        },
        quantity: 1,
      },
    ],
    customer_creation: 'always',
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?cancel=true`,
    metadata: {
      userId,
      credits: credits.toString(),
    },
  })

  return redirect(session.url!)
}
