'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ArtistAbout } from '@/lib/types'

/**
 * Resolve o artista do usuário logado, garantindo que ele é o DONO.
 * O artista só pode editar o próprio perfil — nunca o de outro.
 * Campos de identidade visual (tema, cores, formas, plano, comissão, slug,
 * destaque) NÃO são tocados aqui: essas mudanças são exclusivas do admin.
 */
async function getOwnedArtist() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' as const }

  const { data: artist } = await supabase
    .from('artists')
    .select('id, owner_id')
    .eq('owner_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!artist) return { error: 'Perfil de artista não encontrado.' as const }
  return { supabase, artistId: artist.id as string, userId: user.id }
}

const clip = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

/** Informações básicas + fotos de perfil (não são identidade visual/tema). */
export async function saveArtistProfile(input: {
  name: string
  bio: string
  genre: string
  city: string
  state: string
  avatarUrl: string
  bannerUrl: string
}) {
  const ctx = await getOwnedArtist()
  if ('error' in ctx) return ctx

  const name = clip(input.name, 80)
  if (name.length < 2) return { error: 'O nome deve ter pelo menos 2 caracteres.' }

  const { error } = await ctx.supabase
    .from('artists')
    .update({
      name,
      bio: clip(input.bio, 600) || null,
      genre: clip(input.genre, 60) || null,
      city: clip(input.city, 60) || null,
      state: clip(input.state, 40) || null,
      avatar_url: clip(input.avatarUrl, 600) || null,
      banner_url: clip(input.bannerUrl, 600) || null,
    })
    .eq('id', ctx.artistId)
    .eq('owner_id', ctx.userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/perfil')
  revalidatePath('/dashboard')
  return { error: null }
}

/** Seção "Sobre" (história, influências, discografia, prêmios). */
export async function saveArtistAbout(about: ArtistAbout) {
  const ctx = await getOwnedArtist()
  if ('error' in ctx) return ctx

  const clean: ArtistAbout = {
    history: clip(about.history, 2000) || undefined,
    influences: (about.influences ?? [])
      .map((s) => clip(s, 60))
      .filter(Boolean)
      .slice(0, 12),
    discography: (about.discography ?? [])
      .map((d) => ({ title: clip(d.title, 120), year: clip(d.year, 8) }))
      .filter((d) => d.title)
      .slice(0, 30),
    awards: (about.awards ?? [])
      .map((s) => clip(s, 160))
      .filter(Boolean)
      .slice(0, 30),
  }

  const { error } = await ctx.supabase
    .from('artists')
    .update({ about: clean })
    .eq('id', ctx.artistId)
    .eq('owner_id', ctx.userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/perfil')
  return { error: null }
}

/** Redes sociais. */
export async function saveArtistSocials(socials: Record<string, string>) {
  const ctx = await getOwnedArtist()
  if ('error' in ctx) return ctx

  const allowed = ['instagram', 'tiktok', 'youtube', 'spotify', 'twitter', 'site']
  const clean: Record<string, string> = {}
  for (const key of allowed) {
    const v = clip(socials[key], 300)
    if (v) clean[key] = v
  }

  const { error } = await ctx.supabase
    .from('artists')
    .update({ social_links: clean })
    .eq('id', ctx.artistId)
    .eq('owner_id', ctx.userId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/perfil')
  return { error: null }
}
