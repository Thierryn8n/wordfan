'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Tier } from '@/lib/types'

export async function publishPost({
  artistId,
  slug,
  title,
  content,
  minTier,
}: {
  artistId: string
  slug: string
  title: string
  content: string
  minTier: Tier | null
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  if (!title || !content) return { error: 'Preencha título e conteúdo.' }
  if (title.length > 200 || content.length > 5000) return { error: 'Texto longo demais.' }

  // RLS enforces that only the artist owner or an admin can insert
  const { error } = await supabase.from('posts').insert({
    artist_id: artistId,
    type: 'text',
    title,
    content,
    is_exclusive: minTier !== null,
    min_tier: minTier,
  })

  if (error) {
    console.log('[v0] publish post error:', error.message)
    return { error: 'Sem permissão para publicar neste perfil.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/artist/${slug}`)
  revalidatePath(`/artist/${slug}/club`)
  return { success: true }
}

export async function updatePlan({
  planId,
  slug,
  name,
  priceCents,
}: {
  planId: string
  slug: string
  name: string
  priceCents: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 60) return { error: 'Nome inválido (máx. 60 caracteres).' }
  if (!Number.isInteger(priceCents) || priceCents < 100 || priceCents > 100000000) {
    return { error: 'Preço inválido.' }
  }

  // RLS (plans_write_owner) garante que só o dono do artista ou admin edita
  const { error } = await supabase
    .from('plans')
    .update({ name: trimmed, price_cents: priceCents })
    .eq('id', planId)

  if (error) {
    console.log('[v0] update plan error:', error.message)
    return { error: 'Sem permissão para editar este plano.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/artist/${slug}/plans`)
  return { success: true }
}
