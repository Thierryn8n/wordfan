'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import type { AdPlacement } from '@/lib/types'

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

const PLACEMENTS: AdPlacement[] = ['home_hero', 'home_feed', 'discover']

export interface AdInput {
  title: string
  subtitle: string
  image_url: string
  cta_label: string
  cta_url: string
  placement: AdPlacement
  active: boolean
  position: number
  starts_at: string
  ends_at: string
}

function normalize(input: AdInput) {
  const title = input.title.trim()
  if (!title || title.length > 120) return { error: 'Título inválido (máx. 120 caracteres).' as string }
  if (!PLACEMENTS.includes(input.placement)) return { error: 'Posição inválida.' }
  const cta_url = input.cta_url.trim()
  if (cta_url && !/^https?:\/\/|^\//.test(cta_url)) {
    return { error: 'O link deve começar com http(s):// ou /.' }
  }
  return {
    error: null as string | null,
    row: {
      title,
      subtitle: input.subtitle.trim().slice(0, 240) || null,
      image_url: input.image_url.trim() || null,
      cta_label: input.cta_label.trim().slice(0, 40) || null,
      cta_url: cta_url || null,
      placement: input.placement,
      active: Boolean(input.active),
      position: Number.isFinite(input.position) ? Math.max(0, Math.trunc(input.position)) : 0,
      starts_at: input.starts_at ? new Date(input.starts_at).toISOString() : null,
      ends_at: input.ends_at ? new Date(input.ends_at).toISOString() : null,
    },
  }
}

function revalidateAll() {
  revalidatePath('/admin/ads')
  revalidatePath('/home')
  revalidatePath('/search')
}

export async function createAd(input: AdInput) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const parsed = normalize(input)
  if (parsed.error) return { error: parsed.error }

  const admin = createServiceClient()
  const { error } = await admin.from('ads').insert(parsed.row)
  if (error) {
    console.log('[v0] create ad error:', error.message)
    if (error.message.includes('does not exist') || error.code === '42P01') {
      return { error: 'A tabela de anúncios ainda não existe. Rode o script SQL primeiro.' }
    }
    return { error: 'Não foi possível criar o anúncio.' }
  }

  revalidateAll()
  return { success: true }
}

export async function updateAd(id: string, input: AdInput) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const parsed = normalize(input)
  if (parsed.error) return { error: parsed.error }

  const admin = createServiceClient()
  const { error } = await admin.from('ads').update(parsed.row).eq('id', id)
  if (error) {
    console.log('[v0] update ad error:', error.message)
    return { error: 'Não foi possível atualizar o anúncio.' }
  }

  revalidateAll()
  return { success: true }
}

export async function toggleAd(id: string, active: boolean) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createServiceClient()
  const { error } = await admin.from('ads').update({ active }).eq('id', id)
  if (error) {
    console.log('[v0] toggle ad error:', error.message)
    return { error: 'Não foi possível alterar o status.' }
  }

  revalidateAll()
  return { success: true }
}

export async function deleteAd(id: string) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const admin = createServiceClient()
  const { error } = await admin.from('ads').delete().eq('id', id)
  if (error) {
    console.log('[v0] delete ad error:', error.message)
    return { error: 'Não foi possível excluir o anúncio.' }
  }

  revalidateAll()
  return { success: true }
}
