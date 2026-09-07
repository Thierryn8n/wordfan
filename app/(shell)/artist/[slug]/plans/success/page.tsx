import { redirect } from 'next/navigation'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { fulfillCheckoutSession } from '@/lib/stripe-fulfillment'

/**
 * Página de retorno do Checkout. Ativa a assinatura imediatamente (idempotente
 * com o webhook), garantindo que o acesso seja liberado mesmo antes do webhook
 * chegar, e então redireciona para o clube do artista.
 */
export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session_id?: string }>
}) {
  const { slug } = await params
  const { session_id: sessionId } = await searchParams

  if (sessionId && isStripeConfigured()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      })
      if (session.payment_status === 'paid' || session.status === 'complete') {
        await fulfillCheckoutSession(session)
      }
    } catch (err) {
      console.log('[v0] success fulfill error:', err instanceof Error ? err.message : err)
    }
  }

  redirect(`/artist/${slug}/club?welcome=1`)
}
