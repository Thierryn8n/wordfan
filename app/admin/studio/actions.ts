'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { resolveTheme, type ArtistTheme } from '@/lib/artist-theme'

const HEX = /^#[0-9a-fA-F]{6}$/

function sanitizeTheme(input: ArtistTheme): ArtistTheme | null {
  const t = resolveTheme(input)
  const colors = [t.primary, t.secondary, t.bg, t.surface, t.text, t.muted, t.gradient.from, t.gradient.via, t.gradient.to]
  if (!colors.every((c) => HEX.test(c))) return null
  if (!['holographic', 'neon', 'gold', 'clean'].includes(t.style)) return null
  if (!['sora', 'space-grotesk', 'playfair', 'bebas'].includes(t.font_display)) return null
  if (!['pill', 'flat', 'glass'].includes(t.nav_style)) return null
  if (!Number.isFinite(t.radius) || t.radius < 0 || t.radius > 48) return null
  return t
}

export async function saveArtistStudio({
  artistId,
  slug,
  theme,
  commissionPct,
  toolPlan,
  avatarUrl,
  bannerUrl,
}: {
  artistId: string
  slug: string
  theme: ArtistTheme
  commissionPct: number
  toolPlan: 'basic' | 'pro' | 'premium'
  avatarUrl: string
  bannerUrl: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  // Somente admin (verificado no servidor)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { error: 'Apenas administradores.' }

  const clean = sanitizeTheme(theme)
  if (!clean) return { error: 'Tema inválido: verifique as cores (hex #RRGGBB) e valores.' }

  if (!Number.isFinite(commissionPct) || commissionPct < 0 || commissionPct > 100) {
    return { error: 'Comissão deve estar entre 0 e 100%.' }
  }
  if (!['basic', 'pro', 'premium'].includes(toolPlan)) return { error: 'Plano inválido.' }

  const avatar = avatarUrl.trim().slice(0, 500)
  const banner = bannerUrl.trim().slice(0, 500)

  const { error } = await supabase
    .from('artists')
    .update({
      theme: clean,
      commission_pct: commissionPct,
      tool_plan: toolPlan,
      ...(avatar ? { avatar_url: avatar } : {}),
      ...(banner ? { banner_url: banner } : {}),
    })
    .eq('id', artistId)

  if (error) {
    console.log('[v0] studio save error:', error.message)
    return { error: 'Não foi possível salvar. Verifique suas permissões.' }
  }

  revalidatePath('/admin/studio')
  revalidatePath('/home')
  revalidatePath(`/artist/${slug}`)
  revalidatePath(`/artist/${slug}/plans`)
  revalidatePath(`/artist/${slug}/club`)
  revalidatePath(`/artist/${slug}/live`)
  revalidatePath('/dashboard')
  return { success: true }
}
