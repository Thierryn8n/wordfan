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

  const [{ data: profile }, { data: artist }, { data: manager }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('artists').select('id, slug, owner_id').eq('id', artistId).single(),
    supabase.from('managers').select('id').eq('user_id', user.id).eq('artist_id', artistId).maybeSingle(),
  ])

  if (!artist) return { supabase, error: 'Artista não encontrado.' }
  const isAdmin = profile?.role === 'admin'
  const isOwner = artist.owner_id === user.id
  const isManager = Boolean(manager)
  if (!isAdmin && !isOwner && !isManager) return { supabase, error: 'Sem permissão para gerenciar este artista.' }

  return { supabase, error: null as string | null, slug: artist.slug as string }
}

function revalidateArtist(slug: string) {
  revalidatePath(`/artist/${slug}`)
  revalidatePath(`/artist/${slug}/club`)
  revalidatePath(`/artist/${slug}/plans`)
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

// ============ STORIES ============
export async function saveStory(input: {
  id?: string
  artistId: string
  mediaUrl: string
  caption: string
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const mediaUrl = input.mediaUrl.trim().slice(0, 500)
  if (!mediaUrl) return { error: 'Mídia obrigatória.' }

  const payload = {
    artist_id: input.artistId,
    media_url: mediaUrl,
    caption: input.caption.trim().slice(0, 140) || null,
  }

  const q = input.id
    ? supabase.from('stories').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('stories').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] saveStory error:', dbError.message)
    return { error: 'Não foi possível salvar o story.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

export async function deleteStory(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase.from('stories').delete().eq('id', id).eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível excluir.' }
  revalidateArtist(slug!)
  return { success: true }
}

// ============ LIVES ============
const LIVE_STATUSES = ['scheduled', 'live', 'ended']

export async function saveLive(input: {
  id?: string
  artistId: string
  title: string
  scheduledAt: string
  status: 'scheduled' | 'live' | 'ended'
  isExclusive: boolean
  minTier: string
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const title = input.title.trim().slice(0, 140)
  if (!title) return { error: 'Título obrigatório.' }
  const scheduledAt = new Date(input.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime())) return { error: 'Data inválida.' }

  const status = LIVE_STATUSES.includes(input.status) ? input.status : 'scheduled'
  const minTier = input.isExclusive && TIERS.includes(input.minTier) ? input.minTier : null

  const payload = {
    artist_id: input.artistId,
    title,
    scheduled_at: scheduledAt.toISOString(),
    status,
    min_tier: minTier,
  }

  const q = input.id
    ? supabase.from('lives').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('lives').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] saveLive error:', dbError.message)
    return { error: 'Não foi possível salvar a live.' }
  }

  // Mantém o selo "ao vivo" do artista coerente com as lives em andamento.
  const { data: activeLives } = await supabase
    .from('lives')
    .select('id')
    .eq('artist_id', input.artistId)
    .eq('status', 'live')
  await supabase
    .from('artists')
    .update({ is_live: (activeLives ?? []).length > 0 })
    .eq('id', input.artistId)

  revalidateArtist(slug!)
  revalidatePath('/events')
  revalidatePath('/home')
  return { success: true }
}

export async function deleteLive(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase.from('lives').delete().eq('id', id).eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível excluir.' }

  const { data: activeLives } = await supabase
    .from('lives')
    .select('id')
    .eq('artist_id', artistId)
    .eq('status', 'live')
  await supabase
    .from('artists')
    .update({ is_live: (activeLives ?? []).length > 0 })
    .eq('id', artistId)

  revalidateArtist(slug!)
  revalidatePath('/events')
  revalidatePath('/home')
  return { success: true }
}

// ============ PLANOS (Fan Club) — CRUD completo ============
export async function savePlan(input: {
  id?: string
  artistId: string
  tier: string
  name: string
  priceReais: string
  benefits: string[]
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const name = input.name.trim().slice(0, 60)
  if (!name) return { error: 'Nome do plano obrigatório.' }
  if (!TIERS.includes(input.tier)) return { error: 'Tier inválido.' }

  const cents = Math.round(Number.parseFloat(String(input.priceReais).replace(',', '.')) * 100)
  if (!Number.isFinite(cents) || cents < 100 || cents > 100000000) {
    return { error: 'Preço inválido (mínimo R$ 1,00).' }
  }

  const benefits = input.benefits
    .map((b) => b.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 12)

  const payload = {
    artist_id: input.artistId,
    tier: input.tier,
    name,
    price_cents: cents,
    benefits,
  }

  const q = input.id
    ? supabase.from('plans').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('plans').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] savePlan error:', dbError.message)
    return { error: 'Não foi possível salvar o plano.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

export async function deletePlan(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase.from('plans').delete().eq('id', id).eq('artist_id', artistId)
  if (dbError) {
    console.log('[v0] deletePlan error:', dbError.message)
    return { error: 'Não foi possível excluir. Pode haver assinantes ativos neste plano.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

// ============ UPLOAD DE MÍDIA (admin ou dono) ============
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_VIDEO_BYTES = 50 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export async function uploadContentImage(formData: FormData) {
  const artistId = String(formData.get('artistId') ?? '')
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }

  const file = formData.get('file') as File | null
  const kind = String(formData.get('kind') ?? 'media').slice(0, 20)

  if (!file || file.size === 0) {
    console.log('[upload] Nenhum arquivo enviado')
    return { error: 'Nenhum arquivo enviado.' }
  }

  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)

  if (!isVideo && !isImage) {
    console.log('[upload] Tipo de arquivo inválido:', file.type)
    return { error: 'Formato inválido. Use PNG, JPG, WebP, GIF, MP4, WebM ou MOV.' }
  }

  const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0)
    console.log('[upload] Arquivo muito grande:', file.size, 'máximo:', maxSize)
    return { error: `Arquivo muito grande (máx. ${maxSizeMB}MB).` }
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${slug}/${kind}-${Date.now()}.${ext}`

  console.log('[upload] Iniciando upload:', { path, size: file.size, type: file.type })

  const { error: upError } = await supabase.storage.from('artist-media').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })

  if (upError) {
    console.log('[upload] Erro Supabase:', upError.message, upError)
    if (upError.message.includes('Bucket not found')) {
      return { error: 'Bucket de armazenamento não configurado no Supabase.' }
    }
    if (upError.message.includes('permission')) {
      return { error: 'Sem permissão para fazer upload. Verifique as RLS policies.' }
    }
    if (upError.message.includes('quota')) {
      return { error: 'Cota de armazenamento excedida.' }
    }
    return { error: `Falha no upload: ${upError.message}. Tente novamente.` }
  }

  console.log('[upload] Upload concluído com sucesso:', path)

  const {
    data: { publicUrl },
  } = supabase.storage.from('artist-media').getPublicUrl(path)
  return { url: publicUrl }
}
