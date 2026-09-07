import 'server-only'
import Stripe from 'stripe'

/**
 * Indica se as chaves do Stripe estão configuradas no ambiente.
 * Use antes de chamar getStripe() em código que precisa degradar graciosamente.
 */
export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

let cached: Stripe | null = null

/**
 * Client Stripe (server-only). Reutiliza a instância entre chamadas.
 * A versão de API é a fixada pelo pacote instalado (não sobrescrevemos aqui).
 */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY não configurada.')
  }
  if (!cached) {
    cached = new Stripe(key, { typescript: true })
  }
  return cached
}

/**
 * Data de fim do período atual da assinatura, em ISO. A API do Stripe passou a
 * expor o período no item da assinatura, então lemos os dois lugares.
 */
export function subscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  const secs =
    (sub as unknown as { current_period_end?: number }).current_period_end ??
    sub.items?.data?.[0]?.current_period_end
  return secs ? new Date(secs * 1000).toISOString() : null
}
