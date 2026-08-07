'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AdPlacement } from '@/lib/types'

const PLACEMENTS: AdPlacement[] = ['home_hero', 'home_inline', 'home_footer']

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Você precisa estar logado.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, error: 'Apenas administradores.' }
  return { supabase, error: null }
}

export interface BannerInput {
  title: string
  subtitle: string
  description: string
  image_url: string
  cta_label: string
  cta_url: string
  placement: string
  accent_color: string
  is_active: boolean
  sort_order: number
  starts_at: string
  ends_at: string
}

function sanitize(input: BannerInput) {
  const title = input.title.trim().slice(0, 120)
  const placement = (PLACEMENTS.includes(input.placement as AdPlacement)
    ? input.placement
    : 'home_hero') as AdPlacement
  return {
    title,
    subtitle: input.subtitle.trim().slice(0, 160) || null,
    description: input.description.trim().slice(0, 400) || null,
    image_url: input.image_url.trim() || null,
    cta_label: input.cta_label.trim().slice(0, 40) || null,
    cta_url: input.cta_url.trim().slice(0, 300) || null,
    placement,
    accent_color: input.accent_color.trim().slice(0, 40) || '#ff6b00',
    is_active: Boolean(input.is_active),
    sort_order: Number.isFinite(input.sort_order) ? Math.trunc(input.sort_order) : 0,
    starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null,
    ends_at: input.ends_at ? new Date(input.ends_at).toISOString() : null,
  }
}

export async function createBanner(input: BannerInput) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const payload = sanitize(input)
  if (!payload.title) return { error: 'O título é obrigatório.' }

  const { error } = await supabase.from('ad_banners').insert(payload)
  if (error) {
    console.log('[v0] create banner error:', error.message)
    return { error: 'Não foi possível criar o banner.' }
  }

  revalidatePath('/admin/ads')
  revalidatePath('/home')
  return { success: true }
}

export async function updateBanner(id: string, input: BannerInput) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const payload = sanitize(input)
  if (!payload.title) return { error: 'O título é obrigatório.' }

  const { error } = await supabase
    .from('ad_banners')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.log('[v0] update banner error:', error.message)
    return { error: 'Não foi possível salvar o banner.' }
  }

  revalidatePath('/admin/ads')
  revalidatePath('/home')
  return { success: true }
}

export async function toggleBanner(id: string, isActive: boolean) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const { error } = await supabase
    .from('ad_banners')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    console.log('[v0] toggle banner error:', error.message)
    return { error: 'Não foi possível atualizar o status.' }
  }

  revalidatePath('/admin/ads')
  revalidatePath('/home')
  return { success: true }
}

export async function deleteBanner(id: string) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const { error } = await supabase.from('ad_banners').delete().eq('id', id)
  if (error) {
    console.log('[v0] delete banner error:', error.message)
    return { error: 'Não foi possível excluir o banner.' }
  }

  revalidatePath('/admin/ads')
  revalidatePath('/home')
  return { success: true }
}
