'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/admin-guard'

// Comissão usada quando o artista não tem uma taxa própria configurada.
const DEFAULT_PLATFORM_FEE_PERCENT = 20

function revalidateAll() {
  revalidatePath('/admin/subscriptions')
  revalidatePath('/admin')
  revalidatePath('/profile')
}

/** Cria ou atualiza uma assinatura. Gera a transação quando ativa uma nova. */
export async function saveSubscription(input: {
  id?: string
  userId: string
  planId: string
  status: 'active' | 'canceled'
}) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }

  if (!input.userId) return { error: 'Selecione um usuário.' }
  if (!input.planId) return { error: 'Selecione um plano.' }

  const { data: plan } = await supabase
    .from('plans')
    .select('id, artist_id, price_cents')
    .eq('id', input.planId)
    .single()
  if (!plan) return { error: 'Plano não encontrado.' }

  // Usa a comissão configurada para o artista (fallback para o padrão).
  const { data: artist } = await supabase
    .from('artists')
    .select('commission_pct')
    .eq('id', plan.artist_id)
    .single()
  const feePercent = artist?.commission_pct ?? DEFAULT_PLATFORM_FEE_PERCENT

  const payload = {
    user_id: input.userId,
    artist_id: plan.artist_id,
    plan_id: plan.id,
    status: input.status,
  }

  if (input.id) {
    const { error: dbError } = await supabase.from('subscriptions').update(payload).eq('id', input.id)
    if (dbError) {
      console.log('[v0] saveSubscription update error:', dbError.message)
      return { error: 'Não foi possível atualizar a assinatura.' }
    }
    revalidateAll()
    return { success: true }
  }

  // Impede duplicidade de assinatura ativa do mesmo fã para o mesmo artista.
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', input.userId)
    .eq('artist_id', plan.artist_id)
    .eq('status', 'active')
    .maybeSingle()
  if (existing) return { error: 'Este usuário já possui assinatura ativa com o artista.' }

  const { data: created, error: dbError } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select('id')
    .single()
  if (dbError || !created) {
    console.log('[v0] saveSubscription insert error:', dbError?.message)
    return { error: 'Não foi possível criar a assinatura.' }
  }

  if (input.status === 'active') {
    const fee = Math.round((plan.price_cents * feePercent) / 100)
    await supabase.from('transactions').insert({
      subscription_id: created.id,
      artist_id: plan.artist_id,
      user_id: input.userId,
      amount_cents: plan.price_cents,
      platform_fee_cents: fee,
      artist_net_cents: plan.price_cents - fee,
    })
  }

  revalidateAll()
  return { success: true }
}

/** Alterna entre ativa e cancelada. */
export async function toggleSubscription(id: string, status: 'active' | 'canceled') {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: dbError } = await supabase.from('subscriptions').update({ status }).eq('id', id)
  if (dbError) return { error: 'Não foi possível alterar a assinatura.' }
  revalidateAll()
  return { success: true }
}

export async function deleteSubscription(id: string) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  await supabase.from('transactions').delete().eq('subscription_id', id)
  const { error: dbError } = await supabase.from('subscriptions').delete().eq('id', id)
  if (dbError) return { error: 'Não foi possível excluir a assinatura.' }
  revalidateAll()
  return { success: true }
}
