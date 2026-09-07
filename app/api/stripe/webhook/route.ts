import type Stripe from 'stripe'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import {
  fulfillCheckoutSession,
  fulfillInvoicePaid,
  syncSubscription,
} from '@/lib/stripe-fulfillment'

// Precisa do corpo bruto para validar a assinatura — força runtime Node.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  if (!isStripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Stripe não configurado.', { status: 503 })
  }

  const stripe = getStripe()
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Assinatura ausente.', { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch (err) {
    console.log('[v0] webhook signature error:', err instanceof Error ? err.message : err)
    return new Response('Assinatura inválida.', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session)
        break
      case 'invoice.paid':
        await fulfillInvoicePaid(event.data.object as Stripe.Invoice)
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await syncSubscription(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (err) {
    console.log('[v0] webhook handler error:', err instanceof Error ? err.message : err)
    return new Response('Erro ao processar evento.', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
