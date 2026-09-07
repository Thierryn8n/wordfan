import 'server-only'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/admin'
import { getStripe, subscriptionPeriodEnd } from '@/lib/stripe'

/**
 * Ativação e contabilidade de assinaturas Stripe.
 *
 * Estas funções usam a service role (ignora RLS) e são IDEMPOTENTES: podem ser
 * chamadas tanto pelo webhook quanto pela página de sucesso sem duplicar dados.
 * O split plataforma/artista é gravado em `transactions` para fins contábeis;
 * o repasse financeiro real ao artista exigiria Stripe Connect.
 */

type SubContext = {
  userId: string
  artistId: string
  planId: string
  commissionPct: number
}

/** Extrai o contexto da assinatura a partir dos metadados definidos no checkout. */
function readContext(meta: Stripe.Metadata | null | undefined): SubContext | null {
  if (!meta?.user_id || !meta?.artist_id || !meta?.plan_id) return null
  return {
    userId: meta.user_id,
    artistId: meta.artist_id,
    planId: meta.plan_id,
    commissionPct: Number(meta.commission_pct ?? 20),
  }
}

/**
 * Marca a assinatura como ativa (ou atualiza o ciclo). Retorna o id da linha
 * em `subscriptions`, necessário para vincular transações.
 */
export async function activateSubscription(params: {
  ctx: SubContext
  stripeSubscriptionId: string
  stripeCustomerId: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd?: boolean
  status?: string
}): Promise<string | null> {
  const admin = createServiceClient()
  const { ctx } = params
  const { data, error } = await admin
    .from('subscriptions')
    .upsert(
      {
        user_id: ctx.userId,
        artist_id: ctx.artistId,
        plan_id: ctx.planId,
        status: params.status ?? 'active',
        stripe_subscription_id: params.stripeSubscriptionId,
        stripe_customer_id: params.stripeCustomerId,
        current_period_end: params.currentPeriodEnd,
        cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,artist_id' },
    )
    .select('id')
    .single()

  if (error) {
    console.log('[v0] activateSubscription error:', error.message)
    return null
  }
  return data?.id ?? null
}

/** Registra uma fatura paga como transação, com dedupe por invoice id. */
export async function recordInvoiceTransaction(params: {
  ctx: SubContext
  subscriptionRowId: string | null
  invoiceId: string
  paymentIntentId: string | null
  amountCents: number
  currency: string
}) {
  const admin = createServiceClient()

  // Idempotência: se já registramos esta fatura, não duplica.
  const { data: existing } = await admin
    .from('transactions')
    .select('id')
    .eq('stripe_invoice_id', params.invoiceId)
    .maybeSingle()
  if (existing) return

  const { ctx } = params
  const platformFee = Math.round((params.amountCents * ctx.commissionPct) / 100)
  const { error } = await admin.from('transactions').insert({
    subscription_id: params.subscriptionRowId,
    artist_id: ctx.artistId,
    user_id: ctx.userId,
    amount_cents: params.amountCents,
    platform_fee_cents: platformFee,
    artist_net_cents: params.amountCents - platformFee,
    stripe_invoice_id: params.invoiceId,
    stripe_payment_intent_id: params.paymentIntentId,
    status: 'paid',
    currency: params.currency,
  })
  if (error) console.log('[v0] recordInvoiceTransaction error:', error.message)
}

async function notify(userId: string, title: string, body: string) {
  const admin = createServiceClient()
  await admin.from('notifications').insert({ user_id: userId, title, body })
}

/**
 * Processa um checkout concluído (assinatura). Usado pelo webhook e pela página
 * de sucesso. Ativa a assinatura e, se houver fatura, registra a transação.
 */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return
  const stripe = getStripe()

  const subId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id
  if (!subId) return

  const sub = await stripe.subscriptions.retrieve(subId, {
    expand: ['latest_invoice.payment_intent'],
  })
  const ctx = readContext(sub.metadata) ?? readContext(session.metadata)
  if (!ctx) {
    console.log('[v0] fulfillCheckoutSession: contexto ausente nos metadados')
    return
  }

  const customerId =
    typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null

  const rowId = await activateSubscription({
    ctx,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: customerId,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  })

  const invoice = sub.latest_invoice as Stripe.Invoice | null
  if (invoice && invoice.id) {
    const pi = (invoice as unknown as { payment_intent?: string | { id: string } })
      .payment_intent
    await recordInvoiceTransaction({
      ctx,
      subscriptionRowId: rowId,
      invoiceId: invoice.id,
      paymentIntentId: typeof pi === 'string' ? pi : pi?.id ?? null,
      amountCents: invoice.amount_paid || invoice.total || 0,
      currency: invoice.currency || 'brl',
    })
  }

  await notify(
    ctx.userId,
    'Assinatura ativada',
    'Bem-vindo ao fan club! Seu acesso exclusivo já está liberado.',
  )
}

/** Sincroniza mudanças de assinatura vindas do Stripe (cancelamento, ciclo, falha). */
export async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createServiceClient()
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    unpaid: 'past_due',
    canceled: 'canceled',
    incomplete: 'pending',
    incomplete_expired: 'canceled',
  }
  const { error } = await admin
    .from('subscriptions')
    .update({
      status: statusMap[sub.status] ?? sub.status,
      current_period_end: subscriptionPeriodEnd(sub),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', sub.id)
  if (error) console.log('[v0] syncSubscription error:', error.message)
}

/** Registra a transação de uma fatura paga recorrente (renovações). */
export async function fulfillInvoicePaid(invoice: Stripe.Invoice) {
  const subRef = (invoice as unknown as { subscription?: string | { id: string } })
    .subscription
  const subId = typeof subRef === 'string' ? subRef : subRef?.id
  if (!subId || !invoice.id) return

  const stripe = getStripe()
  const sub = await stripe.subscriptions.retrieve(subId)
  const ctx = readContext(sub.metadata)
  if (!ctx) return

  const admin = createServiceClient()
  const { data: row } = await admin
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subId)
    .maybeSingle()

  const pi = (invoice as unknown as { payment_intent?: string | { id: string } })
    .payment_intent
  await recordInvoiceTransaction({
    ctx,
    subscriptionRowId: row?.id ?? null,
    invoiceId: invoice.id,
    paymentIntentId: typeof pi === 'string' ? pi : pi?.id ?? null,
    amountCents: invoice.amount_paid || invoice.total || 0,
    currency: invoice.currency || 'brl',
  })

  await activateSubscription({
    ctx,
    stripeSubscriptionId: sub.id,
    stripeCustomerId:
      typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    currentPeriodEnd: subscriptionPeriodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  })
}
