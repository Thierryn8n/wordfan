'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_THEME, type ArtistTheme } from '@/lib/artist-theme'
import type { ArtistAbout } from '@/lib/types'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const HEX = /^#[0-9a-fA-F]{6}$/

// ===== Autorização: admin OU dono do artista =====
async function requireOwner(artistId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Você precisa estar logado.' }

  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('artists').select('id, slug, owner_id').eq('id', artistId).single(),
  ])
  if (!artist) return { supabase, error: 'Artista não encontrado.' }
  const isAdmin = profile?.role === 'admin'
  const isOwner = artist.owner_id === user.id
  if (!isAdmin && !isOwner) return { supabase, error: 'Sem permissão para editar este artista.' }

  return { supabase, error: null as string | null, slug: artist.slug as string }
}

function revalidateAll(slug: string) {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/perfil')
  revalidatePath(`/artist/${slug}`)
  revalidatePath(`/artist/${slug}/club`)
  revalidatePath('/home')
  revalidatePath('/search')
}

// ============ IDENTIDADE (dados básicos + redes) ============
export async function saveArtistIdentity(input: {
  artistId: string
  name: string
  bio: string
  genre: string
  city: string
  state: string
  avatarUrl: string
  bannerUrl: string
  social: Record<string, string>
}) {
  const { supabase, error, slug } = await requireOwner(input.artistId)
  if (error) return { error }

  const name = input.name.trim().slice(0, 80)
  if (name.length < 2) return { error: 'O nome deve ter pelo menos 2 caracteres.' }

  // Mantém apenas redes com valor, limitando tamanho.
  const social: Record<string, string> = {}
  for (const [k, v] of Object.entries(input.social)) {
    const val = (v ?? '').trim().slice(0, 200)
    if (val) social[k.slice(0, 20)] = val
  }

  const { error: dbError } = await supabase
    .from('artists')
    .update({
      name,
      bio: input.bio.trim().slice(0, 280) || null,
      genre: input.genre.trim().slice(0, 40) || null,
      city: input.city.trim().slice(0, 60) || null,
      state: input.state.trim().slice(0, 2).toUpperCase() || null,
      avatar_url: input.avatarUrl.trim().slice(0, 600) || null,
      banner_url: input.bannerUrl.trim().slice(0, 600) || null,
      social_links: social,
    })
    .eq('id', input.artistId)

  if (dbError) {
    console.log('[v0] saveArtistIdentity error:', dbError.message)
    return { error: 'Não foi possível salvar. Tente novamente.' }
  }
  revalidateAll(slug!)
  return { success: true }
}

// ============ TEMA (identidade visual única) ============
export async function saveArtistTheme(input: { artistId: string; theme: ArtistTheme }) {
  const { supabase, error, slug } = await requireOwner(input.artistId)
  if (error) return { error }

  const t = input.theme
  const colors = [t.primary, t.secondary, t.bg, t.surface, t.text, t.muted, t.gradient.from, t.gradient.via, t.gradient.to]
  if (colors.some((c) => !HEX.test(c))) return { error: 'Cores inválidas (use formato #RRGGBB).' }

  const styles = ['holographic', 'neon', 'gold', 'clean']
  const fonts = ['sora', 'space-grotesk', 'playfair', 'bebas']
  const navs = ['pill', 'flat', 'glass']

  const clean: ArtistTheme = {
    primary: t.primary,
    secondary: t.secondary,
    bg: t.bg,
    surface: t.surface,
    text: t.text,
    muted: t.muted,
    gradient: { from: t.gradient.from, via: t.gradient.via, to: t.gradient.to },
    style: styles.includes(t.style) ? t.style : DEFAULT_THEME.style,
    font_display: fonts.includes(t.font_display) ? t.font_display : DEFAULT_THEME.font_display,
    radius: Math.min(40, Math.max(0, Math.round(Number(t.radius) || DEFAULT_THEME.radius))),
    nav_style: navs.includes(t.nav_style) ? t.nav_style : DEFAULT_THEME.nav_style,
  }

  const { error: dbError } = await supabase
    .from('artists')
    .update({ theme: clean })
    .eq('id', input.artistId)

  if (dbError) {
    console.log('[v0] saveArtistTheme error:', dbError.message)
    return { error: 'Não foi possível salvar o tema.' }
  }
  revalidateAll(slug!)
  return { success: true }
}

// ============ SOBRE (história, prêmios, influências, discografia) ============
export async function saveArtistAbout(input: { artistId: string; about: ArtistAbout }) {
  const { supabase, error, slug } = await requireOwner(input.artistId)
  if (error) return { error }

  const a = input.about
  const clean: ArtistAbout = {
    history: (a.history ?? '').trim().slice(0, 2000) || undefined,
    influences: (a.influences ?? [])
      .map((x) => x.trim().slice(0, 60))
      .filter(Boolean)
      .slice(0, 12),
    awards: (a.awards ?? [])
      .map((x) => x.trim().slice(0, 120))
      .filter(Boolean)
      .slice(0, 12),
    discography: (a.discography ?? [])
      .map((d) => ({ title: (d.title ?? '').trim().slice(0, 100), year: (d.year ?? '').trim().slice(0, 4) }))
      .filter((d) => d.title)
      .slice(0, 20),
  }

  const { error: dbError } = await supabase
    .from('artists')
    .update({ about: clean })
    .eq('id', input.artistId)

  if (dbError) {
    console.log('[v0] saveArtistAbout error:', dbError.message)
    return { error: 'Não foi possível salvar as informações.' }
  }
  revalidateAll(slug!)
  return { success: true }
}

// ============ UPLOAD de avatar/banner ============
export async function uploadArtistImage(formData: FormData) {
  const artistId = String(formData.get('artistId') ?? '')
  const { supabase, error, slug } = await requireOwner(artistId)
  if (error) return { error }

  const file = formData.get('file') as File | null
  const kind = String(formData.get('kind') ?? 'media').slice(0, 20)

  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Imagem muito grande (máx. 5MB).' }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Formato inválido (PNG, JPG, WebP ou GIF).' }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${slug}/${kind}-${Date.now()}.${ext}`

  const { error: upError } = await supabase.storage.from('artist-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (upError) {
    console.log('[v0] uploadArtistImage error:', upError.message)
    return { error: 'Falha no upload. Tente novamente.' }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('artist-media').getPublicUrl(path)
  return { url: publicUrl }
}

// ============ MODERAÇÃO: excluir comentário ============
export async function deleteFanComment(input: { commentId: string; artistId: string }) {
  const { supabase, error, slug } = await requireOwner(input.artistId)
  if (error) return { error }

  const { error: dbError } = await supabase.from('post_comments').delete().eq('id', input.commentId)
  if (dbError) {
    console.log('[v0] deleteFanComment error:', dbError.message)
    return { error: 'Não foi possível remover o comentário.' }
  }
  revalidatePath('/dashboard/comunidade')
  if (slug) revalidatePath(`/artist/${slug}`)
  return { success: true }
}
