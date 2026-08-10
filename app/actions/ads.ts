'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AdPlacement } from '@/lib/types'

const PLACEMENTS: AdPlacement[] = ['home_hero', 'home_inline', 'discover', 'events']

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Você precisa estar logado.' as string | null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, error: 'Sem permissão. Apenas administradores.' }
  return { supabase, error: null as string | null }
}

function revalidateAds() {
  revalidatePath('/admin/ads')
  revalidatePath('/home')
  revalidatePath('/events')
  revalidatePath('/search')
}

function orNull(v: string | undefined | null) {
  const t = (v ?? '').trim()
  return t.length ? t : null
}

/** Converte "2026-08-20" (input date) em timestamptz ISO, ou null. */
function toIso(v: string | undefined | null) {
  const t = orNull(v)
  if (!t) return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function saveAd(input: {
  id?: string
  title: string
  subtitle?: string
  description?: string
  imageUrl?: string
  ctaLabel?: string
  ctaUrl?: string
  placement: string
  accentColor?: string
  isActive: boolean
  sortOrder?: number
  startsAt?: string
  endsAt?: string
}) {
  const { supabase, error } = await requireAdmin()
  if (error) return { error }

  const title = input.title.trim().slice(0, 120)
  if (!title) return { error: 'O título é obrigatório.' }

  const placement = (PLACEMENTS as string[]).includes(input.placement)
    ? (input.placement as AdPlacement)
    : 'home_inline'

  const accent = orNull(input.accentColor)
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
    return { error: 'Cor de destaque inválida (use formato #RRGGBB).' }
  }

  const payload = {
    title,
    subtitle: orNull(input.subtitle)?.slice(0, 240) ?? null,
    description: orNull(input.description)?.slice(0, 600) ?? null,
    image_url: orNull(input.imageUrl)?.slice(0, 600) ?? null,
    cta_label: orNull(input.ctaLabel)?.slice(0, 40) ?? null,
    cta_url: orNull(input.ctaUrl)?.slice(0, 600) ?? null,
    placement,
    accent_color: accent,
    is_active: Boolean(input.isActive),
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    starts_at: toIso(input.startsAt),
    ends_at: toIso(input.endsAt),
    updated_at: new Date().toISOString(),
  }

  const q = input.id
    ? supabase.from('ad_banners').update(payload).eq('id', input.id)
    : supabase.from('ad_banners').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] saveAd error:', dbError.message)
    return { error: dbError.message }
  }

  revalidateAds()
  return { error: null }
}

export async function toggleAd(id: string, isActive: boolean) {
  const { supabase, error } = await requireAdmin()
  if (error) return { error }
  const { error: dbError } = await supabase
    .from('ad_banners')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (dbError) return { error: dbError.message }
  revalidateAds()
  return { error: null }
}

export async function deleteAd(id: string) {
  const { supabase, error } = await requireAdmin()
  if (error) return { error }
  const { error: dbError } = await supabase.from('ad_banners').delete().eq('id', id)
  if (dbError) return { error: dbError.message }
  revalidateAds()
  return { error: null }
}

/** Registra um clique no anúncio (chamado pela UI pública). */
export async function trackAdClick(id: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('ad_banners').select('clicks').eq('id', id).maybeSingle()
  if (!data) return { error: null }
  await supabase
    .from('ad_banners')
    .update({ clicks: (data.clicks ?? 0) + 1 })
    .eq('id', id)
  return { error: null }
}
