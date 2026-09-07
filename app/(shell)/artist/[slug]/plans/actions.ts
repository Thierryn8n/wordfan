'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { getStripe, isStripeConfigured } from '@/lib/stripe'

async function getOrigin() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  return `${proto}://${host}`
}

/**
 * Cria uma sessão de Checkout do Stripe (assinatura mensal recorrente) e
 * devolve a URL de pagamento. O preço e a comissão vêm SEMPRE do banco — o
 * cliente só escolhe qual plano quer, nunca o valor.
 */
export async function subscribeToPlan(
  slug: string,
  planId: string,
): Promise<{ error: string } | { url: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/artist/${slug}/plans`)
  }

  if (!isStripeConfigured()) {
    return {
      error: 'Pagamentos ainda não estão configurados. Tente novamente em breve.',
    }
  }

  // Validação server-side: o plano precisa pertencer ao artista deste slug.
  const { data: plan } = await supabase
    .from('plans')
    .select('id, artist_id, price_cents, name, tier, artists!inner(slug, name, commission_pct)')
    .eq('id', planId)
    .single()

  const artist = plan?.artists as unknown as {
    slug: string
    name: string
    commission_pct: number
  }

  if (!plan || artist?.slug !== slug) {
    return { error: 'Plano inválido.' }
  }
  if (!plan.price_cents || plan.price_cents < 100) {
    return { error: 'Este plano não está disponível para assinatura.' }
  }

  const stripe = getStripe()
  const admin = createServiceClient()

  // Cliente Stripe reutilizável por usuário (guardado em profiles).
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, display_name')
    .eq('id', user.id)
    .maybeSingle()

  let customerId = profile?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.display_name ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const commissionPct = Number(artist.commission_pct ?? 20)
  const metadata = {
    user_id: user.id,
    artist_id: plan.artist_id,
    plan_id: plan.id,
    commission_pct: String(commissionPct),
  }

  const origin = await getOrigin()
  let checkoutUrl: string | null = null
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'brl',
            unit_amount: plan.price_cents,
            recurring: { interval: 'month' },
            product_data: { name: `${artist.name} — ${plan.name}` },
          },
        },
      ],
      metadata,
      subscription_data: { metadata },
      success_url: `${origin}/artist/${slug}/plans/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/artist/${slug}/plans`,
      allow_promotion_codes: true,
    })
    checkoutUrl = session.url
  } catch (err) {
    console.log('[v0] checkout session error:', err instanceof Error ? err.message : err)
    return { error: 'Não foi possível iniciar o pagamento. Tente novamente.' }
  }

  // Marca uma assinatura pendente (não concede acesso até o pagamento confirmar).
  await admin.from('subscriptions').upsert(
    {
      user_id: user.id,
      artist_id: plan.artist_id,
      plan_id: plan.id,
      status: 'pending',
      stripe_customer_id: customerId,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,artist_id' },
  )

  if (!checkoutUrl) {
    return { error: 'Não foi possível iniciar o pagamento. Tente novamente.' }
  }
  return { url: checkoutUrl }
}

/**
 * Cancela a assinatura ao fim do período pago (o fã mantém acesso até lá).
 * Se não houver assinatura Stripe vinculada (dado legado), cancela na hora.
 */
export async function cancelSubscription(slug: string, artistId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', user.id)
    .eq('artist_id', artistId)
    .maybeSingle()

  const admin = createServiceClient()
  if (sub?.stripe_subscription_id && isStripeConfigured()) {
    try {
      await getStripe().subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      })
      await admin
        .from('subscriptions')
        .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('artist_id', artistId)
    } catch (err) {
      console.log('[v0] cancel error:', err instanceof Error ? err.message : err)
    }
  } else {
    await admin
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('artist_id', artistId)
  }

  revalidatePath(`/artist/${slug}`)
  redirect(`/artist/${slug}`)
}
