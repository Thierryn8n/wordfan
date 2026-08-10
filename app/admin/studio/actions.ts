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
      avatar_url: avatar || null,
      banner_url: banner || null,
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

// Admin OU dono do artista (para edição de perfil e uploads)
async function requireManager(artistId?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Você precisa estar logado.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'admin') return { supabase, error: null }
  if (artistId) {
    const [{ data: artist }, { data: manager }] = await Promise.all([
      supabase.from('artists').select('owner_id').eq('id', artistId).single(),
      supabase.from('managers').select('id').eq('user_id', user.id).eq('artist_id', artistId).maybeSingle(),
    ])
    if (artist?.owner_id === user.id || manager) return { supabase, error: null }
  } else {
    // Sem artistId: permite se o usuário é dono OU empresário de algum artista (para uploads)
    const [{ data: owned }, { data: managed }] = await Promise.all([
      supabase.from('artists').select('id').eq('owner_id', user.id).limit(1),
      supabase.from('managers').select('id').eq('user_id', user.id).limit(1),
    ])
    if ((owned && owned.length > 0) || (managed && managed.length > 0)) return { supabase, error: null }
  }
  return { supabase, error: 'Sem permissão para esta ação.' }
}

export async function saveArtistProfile({
  artistId,
  slug,
  name,
  bio,
  genre,
  city,
  state,
  socialLinks,
  about,
  avatarUrl,
  bannerUrl,
  logoUrl,
}: {
  artistId: string
  slug: string
  name: string
  bio: string
  genre: string
  city: string
  state: string
  socialLinks: Record<string, string>
  avatarUrl: string
  bannerUrl: string
  logoUrl: string
  about: {
    history: string
    influences: string[]
    discography: { title: string; year: string }[]
    awards: string[]
  }
}) {
  const { supabase, error: authError } = await requireManager(artistId)
  if (authError) return { error: authError }

  const cleanName = name.trim()
  if (!cleanName || cleanName.length > 80) return { error: 'Nome inválido (máx. 80 caracteres).' }
  if (bio.length > 600) return { error: 'Bio muito longa (máx. 600 caracteres).' }
  if (about.history.length > 3000) return { error: 'História muito longa (máx. 3000 caracteres).' }

  const cleanSocials: Record<string, string> = {}
  for (const key of ['instagram', 'tiktok', 'spotify', 'youtube', 'facebook', 'site']) {
    const v = (socialLinks[key] ?? '').trim().slice(0, 200)
    if (v) cleanSocials[key] = v
  }

  const cleanAbout = {
    history: about.history.trim().slice(0, 3000),
    influences: about.influences.map((i) => i.trim().slice(0, 80)).filter(Boolean).slice(0, 12),
    discography: about.discography
      .map((d) => ({ title: d.title.trim().slice(0, 120), year: d.year.trim().slice(0, 8) }))
      .filter((d) => d.title)
      .slice(0, 20),
    awards: about.awards.map((a) => a.trim().slice(0, 160)).filter(Boolean).slice(0, 20),
  }

  const avatar = avatarUrl.trim().slice(0, 500)
  const banner = bannerUrl.trim().slice(0, 500)
  const logo = logoUrl.trim().slice(0, 500)

  const { error } = await supabase
    .from('artists')
    .update({
      name: cleanName,
      bio: bio.trim().slice(0, 600),
      genre: genre.trim().slice(0, 60),
      city: city.trim().slice(0, 60),
      state: state.trim().slice(0, 2).toUpperCase(),
      social_links: cleanSocials,
      about: cleanAbout,
      avatar_url: avatar || null,
      banner_url: banner || null,
      logo_url: logo || null,
    })
    .eq('id', artistId)

  if (error) {
    console.log('[v0] profile save error:', error.message)
    return { error: 'Não foi possível salvar o perfil.' }
  }

  revalidatePath('/admin/studio')
  revalidatePath('/home')
  revalidatePath('/search')
  revalidatePath(`/artist/${slug}`)
  return { success: true }
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']

export async function uploadArtistImage(formData: FormData) {
  const artistId = String(formData.get('artistId') ?? '')
  const { supabase, error: authError } = await requireManager(artistId)
  if (authError) return { error: authError }

  const file = formData.get('file') as File | null
  const kind = String(formData.get('kind') ?? '')

  if (!artistId) return { error: 'Artista não identificado.' }
  if (kind !== 'avatar' && kind !== 'banner' && kind !== 'logo') return { error: 'Tipo de imagem inválido.' }
  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Imagem muito grande (máx. 5MB).' }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Formato inválido (use PNG, JPG, WebP, GIF ou SVG).' }

  const { data: artist } = await supabase
    .from('artists')
    .select('slug')
    .eq('id', artistId)
    .single()
  if (!artist?.slug) return { error: 'Artista não encontrado.' }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${artist.slug}/${kind}-${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('artist-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (error) {
    console.log('[v0] upload error:', error.message)
    return { error: 'Falha no upload. Tente novamente.' }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('artist-media').getPublicUrl(path)

  const column = kind === 'avatar' ? 'avatar_url' : kind === 'banner' ? 'banner_url' : 'logo_url'
  const { error: updateError } = await supabase
    .from('artists')
    .update({ [column]: publicUrl })
    .eq('id', artistId)

  if (updateError) {
    await supabase.storage.from('artist-media').remove([path])
    console.log('[v0] artist image update error:', updateError.message)
    return { error: 'A imagem foi enviada, mas não foi possível atualizar o perfil.' }
  }

  revalidatePath('/admin/studio')
  revalidatePath('/admin/artists')
  revalidatePath('/home')
  revalidatePath('/search')
  revalidatePath(`/artist/${artist.slug}`)
  revalidatePath('/dashboard')

  return { url: publicUrl }
}
