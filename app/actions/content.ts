'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// ===== Autorização compartilhada: admin OU dono do artista =====
async function requireManager(artistId: string) {
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
  if (!isAdmin && !isOwner) return { supabase, error: 'Sem permissão para gerenciar este artista.' }

  return { supabase, error: null as string | null, slug: artist.slug as string }
}

function revalidateArtist(slug: string) {
  revalidatePath(`/artist/${slug}`)
  revalidatePath(`/artist/${slug}/club`)
  revalidatePath('/dashboard')
  revalidatePath('/admin/studio')
}

const TIERS = ['bronze', 'silver', 'gold', 'platinum']

// ============ FEED (posts) ============
export async function savePost(input: {
  id?: string
  artistId: string
  type: 'text' | 'image' | 'video'
  title: string
  content: string
  mediaUrl: string
  isExclusive: boolean
  minTier: string
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const title = input.title.trim().slice(0, 140)
  if (!title) return { error: 'Título obrigatório.' }
  const minTier = input.isExclusive && TIERS.includes(input.minTier) ? input.minTier : null

  const payload = {
    artist_id: input.artistId,
    type: input.type,
    title,
    content: input.content.trim().slice(0, 2000) || null,
    media_url: input.mediaUrl.trim().slice(0, 500) || null,
    is_exclusive: input.isExclusive,
    min_tier: minTier,
  }

  const q = input.id
    ? supabase.from('posts').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('posts').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] savePost error:', dbError.message)
    return { error: 'Não foi possível salvar a publicação.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

export async function deletePost(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase.from('posts').delete().eq('id', id).eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível excluir.' }
  revalidateArtist(slug!)
  return { success: true }
}

// ============ AGENDA (shows) ============
export async function saveShow(input: {
  id?: string
  artistId: string
  title: string
  venue: string
  city: string
  state: string
  startsAt: string
  status: 'scheduled' | 'done' | 'canceled'
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const title = input.title.trim().slice(0, 140)
  if (!title) return { error: 'Título obrigatório.' }
  const startsAt = new Date(input.startsAt)
  if (Number.isNaN(startsAt.getTime())) return { error: 'Data inválida.' }

  const payload = {
    artist_id: input.artistId,
    title,
    venue: input.venue.trim().slice(0, 120) || null,
    city: input.city.trim().slice(0, 60) || null,
    state: input.state.trim().slice(0, 2).toUpperCase() || null,
    starts_at: startsAt.toISOString(),
    status: ['scheduled', 'done', 'canceled'].includes(input.status) ? input.status : 'scheduled',
  }

  const q = input.id
    ? supabase.from('shows').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('shows').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] saveShow error:', dbError.message)
    return { error: 'Não foi possível salvar o show.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

export async function deleteShow(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase.from('shows').delete().eq('id', id).eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível excluir.' }
  revalidateArtist(slug!)
  return { success: true }
}

// ============ GALERIA ============
export async function saveGalleryItem(input: {
  id?: string
  artistId: string
  url: string
  album: string
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const url = input.url.trim().slice(0, 500)
  if (!url) return { error: 'Imagem obrigatória.' }

  const payload = {
    artist_id: input.artistId,
    type: 'photo' as const,
    url,
    album: input.album.trim().slice(0, 80) || null,
  }

  const q = input.id
    ? supabase.from('gallery_items').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('gallery_items').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] saveGallery error:', dbError.message)
    return { error: 'Não foi possível salvar a foto.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

export async function deleteGalleryItem(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase
    .from('gallery_items')
    .delete()
    .eq('id', id)
    .eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível excluir.' }
  revalidateArtist(slug!)
  return { success: true }
}

// ============ VÍDEOS ============
export async function saveVideo(input: {
  id?: string
  artistId: string
  title: string
  category: 'clipe' | 'show' | 'entrevista' | 'bastidores'
  thumbnailUrl: string
  duration: string
  isExclusive: boolean
  minTier: string
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const title = input.title.trim().slice(0, 140)
  if (!title) return { error: 'Título obrigatório.' }
  const category = ['clipe', 'show', 'entrevista', 'bastidores'].includes(input.category)
    ? input.category
    : 'clipe'
  const minTier = input.isExclusive && TIERS.includes(input.minTier) ? input.minTier : null

  const payload = {
    artist_id: input.artistId,
    title,
    category,
    thumbnail_url: input.thumbnailUrl.trim().slice(0, 500) || null,
    duration: input.duration.trim().slice(0, 12) || null,
    is_exclusive: input.isExclusive,
    min_tier: minTier,
  }

  const q = input.id
    ? supabase.from('videos').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('videos').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] saveVideo error:', dbError.message)
    return { error: 'Não foi possível salvar o vídeo.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

export async function deleteVideo(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase.from('videos').delete().eq('id', id).eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível excluir.' }
  revalidateArtist(slug!)
  return { success: true }
}

// ============ UPLOAD DE MÍDIA (admin ou dono) ============
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export async function uploadContentImage(formData: FormData) {
  const artistId = String(formData.get('artistId') ?? '')
  const { supabase, error, slug } = await requireManager(artistId)
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
    console.log('[v0] upload error:', upError.message)
    return { error: 'Falha no upload. Tente novamente.' }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('artist-media').getPublicUrl(path)
  return { url: publicUrl }
}
