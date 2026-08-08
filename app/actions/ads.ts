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

export async function saveAd(input: {
  id?: string
  title: string
  subtitle?: string
  imageUrl?: string
  ctaLabel?: string
  ctaHref?: string
  placement: string
  active: boolean
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

  const payload = {
    title,
    subtitle: orNull(input.subtitle)?.slice(0, 240) ?? null,
    image_url: orNull(input.imageUrl)?.slice(0, 600) ?? null,
    cta_label: orNull(input.ctaLabel)?.slice(0, 40) ?? null,
    cta_href: orNull(input.ctaHref)?.slice(0, 600) ?? null,
    placement,
    active: Boolean(input.active),
    sort_order: Number.isFinite(input.sortOrder) ? Number(input.sortOrder) : 0,
    starts_at: orNull(input.startsAt),
    ends_at: orNull(input.endsAt),
  }

  const q = input.id
    ? supabase.from('ads').update(payload).eq('id', input.id)
    : supabase.from('ads').insert(payload)
  const { error: dbError } = await q
  if (dbError) return { error: dbError.message }

  revalidateAds()
  return { error: null }
}

export async function toggleAd(id: string, active: boolean) {
  const { supabase, error } = await requireAdmin()
  if (error) return { error }
  const { error: dbError } = await supabase.from('ads').update({ active }).eq('id', id)
  if (dbError) return { error: dbError.message }
  revalidateAds()
  return { error: null }
}

export async function deleteAd(id: string) {
  const { supabase, error } = await requireAdmin()
  if (error) return { error }
  const { error: dbError } = await supabase.from('ads').delete().eq('id', id)
  if (dbError) return { error: dbError.message }
  revalidateAds()
  return { error: null }
}
