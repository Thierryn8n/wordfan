'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function subscribeToPlan(slug: string, planId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?next=/artist/${slug}/plans`)
  }

  // Validate plan belongs to the artist with this slug (server-side)
  const { data: plan } = await supabase
    .from('plans')
    .select('id, artist_id, artists!inner(slug)')
    .eq('id', planId)
    .single()

  if (!plan || (plan.artists as unknown as { slug: string }).slug !== slug) {
    return { error: 'Plano inválido.' }
  }

  // Upsert: one subscription per user per artist (simulated payment)
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: user.id,
        artist_id: plan.artist_id,
        plan_id: plan.id,
        status: 'active',
        started_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,artist_id' },
    )

  if (error) {
    console.log('[v0] subscribe error:', error.message)
    return { error: 'Não foi possível concluir a assinatura. Tente novamente.' }
  }

  await supabase.from('notifications').insert({
    user_id: user.id,
    title: 'Assinatura ativada',
    body: 'Bem-vindo ao fan club! Seu acesso exclusivo já está liberado.',
  })

  revalidatePath(`/artist/${slug}`)
  revalidatePath(`/artist/${slug}/club`)
  redirect(`/artist/${slug}/club`)
}

export async function cancelSubscription(slug: string, artistId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  await supabase
    .from('subscriptions')
    .update({ status: 'canceled' })
    .eq('user_id', user.id)
    .eq('artist_id', artistId)

  revalidatePath(`/artist/${slug}`)
  redirect(`/artist/${slug}`)
}
