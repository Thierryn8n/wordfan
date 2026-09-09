'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { TIER_ORDER } from '@/lib/types'

// Compara o tier do usuário com o mínimo exigido (bronze < silver < gold < platinum).
function tierAllows(userTier: string | null | undefined, minTier: string | null | undefined) {
  if (!minTier) return true
  if (!userTier) return false
  return TIER_ORDER.indexOf(userTier as never) >= TIER_ORDER.indexOf(minTier as never)
}

// Aceita apenas URLs http(s) para o link de transmissão.
function sanitizeStreamUrl(raw: string | undefined | null): string | null {
  const v = (raw ?? '').trim()
  if (!v) return null
  try {
    const u = new URL(v)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return v.slice(0, 500)
  } catch {
    return null
  }
}

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
  mediaType?: 'image' | 'video'
  durationMs?: number
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const mediaUrl = input.mediaUrl.trim().slice(0, 500)
  if (!mediaUrl) return { error: 'Mídia obrigatória.' }

  const payload = {
    artist_id: input.artistId,
    media_url: mediaUrl,
    caption: input.caption.trim().slice(0, 140) || null,
    media_type: input.mediaType ?? 'image',
    duration_ms: input.durationMs ? Math.round(input.durationMs) : null,
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
  streamUrl?: string
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const title = input.title.trim().slice(0, 140)
  if (!title) return { error: 'Título obrigatório.' }
  const scheduledAt = new Date(input.scheduledAt)
  if (Number.isNaN(scheduledAt.getTime())) return { error: 'Data inválida.' }

  const status = LIVE_STATUSES.includes(input.status) ? input.status : 'scheduled'
  const minTier = input.isExclusive && TIERS.includes(input.minTier) ? input.minTier : null
  const streamUrl = sanitizeStreamUrl(input.streamUrl)

  // started_at: marca o instante em que a live entrou no ar (preserva o valor
  // já existente em atualizações; limpa ao reagendar).
  let startedAt: string | null | undefined
  if (status === 'live') {
    let existing: string | null = null
    if (input.id) {
      const { data } = await supabase.from('lives').select('started_at').eq('id', input.id).single()
      existing = (data?.started_at as string | null) ?? null
    }
    startedAt = existing ?? new Date().toISOString()
  } else if (status === 'scheduled') {
    startedAt = null
  }
  // status 'ended' => não mexe em started_at (mantém histórico).

  const payload = {
    artist_id: input.artistId,
    title,
    scheduled_at: scheduledAt.toISOString(),
    status,
    min_tier: minTier,
    stream_url: streamUrl,
    ...(startedAt !== undefined ? { started_at: startedAt } : {}),
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

// ============ MÚSICAS (Top 10 + lançamentos) ============
export async function saveSong(input: {
  id?: string
  artistId: string
  title: string
  audioUrl: string
  coverUrl: string
  durationSeconds: number
  rank: number
  isNewRelease: boolean
  isExclusive: boolean
  minTier: string
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  const title = input.title.trim().slice(0, 140)
  if (!title) return { error: 'Título obrigatório.' }
  const audioUrl = input.audioUrl.trim().slice(0, 500)
  if (!audioUrl) return { error: 'Envie o arquivo de áudio.' }

  const rank = Number.isFinite(input.rank) ? Math.max(0, Math.min(999, Math.trunc(input.rank))) : 0
  const duration = Number.isFinite(input.durationSeconds)
    ? Math.max(0, Math.trunc(input.durationSeconds))
    : 0
  const minTier = input.isExclusive && TIERS.includes(input.minTier) ? input.minTier : null

  const payload = {
    artist_id: input.artistId,
    title,
    audio_url: audioUrl,
    cover_url: input.coverUrl.trim().slice(0, 500) || null,
    duration_seconds: duration,
    rank,
    is_new_release: input.isNewRelease,
    is_exclusive: input.isExclusive,
    min_tier: minTier,
  }

  const q = input.id
    ? supabase.from('songs').update(payload).eq('id', input.id).eq('artist_id', input.artistId)
    : supabase.from('songs').insert(payload)
  const { error: dbError } = await q
  if (dbError) {
    console.log('[v0] saveSong error:', dbError.message)
    return { error: 'Não foi possível salvar a música.' }
  }
  revalidateArtist(slug!)
  return { success: true }
}

export async function deleteSong(id: string, artistId: string) {
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase.from('songs').delete().eq('id', id).eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível excluir.' }
  revalidateArtist(slug!)
  return { success: true }
}

// Upload de áudio para o bucket 'artist-audio' (mp3/aac/wav/ogg, até 25MB).
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/mp4',
  'audio/x-m4a', 'audio/wav', 'audio/ogg', 'audio/webm',
]
const MAX_AUDIO_BYTES = 25 * 1024 * 1024

export async function uploadContentAudio(formData: FormData) {
  const artistId = String(formData.get('artistId') ?? '')
  const { supabase, error, slug } = await requireManager(artistId)
  if (error) return { error }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }

  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return { error: 'Formato inválido. Use MP3, AAC, M4A, WAV ou OGG.' }
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { error: 'Áudio muito grande (máx. 25MB).' }
  }

  const extMap: Record<string, string> = {
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/aac': 'aac',
    'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav',
    'audio/ogg': 'ogg', 'audio/webm': 'webm',
  }
  const ext = extMap[file.type] ?? 'mp3'
  const path = `${slug}/song-${Date.now()}.${ext}`

  const { error: upError } = await supabase.storage.from('artist-audio').upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (upError) {
    console.log('[upload-audio] erro:', upError.message)
    if (upError.message.includes('Bucket not found')) {
      return { error: 'Bucket de áudio não configurado no Supabase.' }
    }
    return { error: `Falha no upload: ${upError.message}` }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('artist-audio').getPublicUrl(path)
  return { url: publicUrl }
}

// ============ CHAT AO VIVO ============
// Envia uma mensagem no chat da live. Qualquer fã autenticado com acesso ao
// tier da live pode escrever; a distribuição em tempo real é feita pelo
// Supabase Realtime (o insert dispara o broadcast para todos os assinantes).
export async function sendLiveMessage(input: { liveId: string; body: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const body = input.body.trim().slice(0, 500)
  if (!body) return { error: 'Mensagem vazia.' }

  // Confirma que a live existe, está no ar e valida o tier de acesso.
  const { data: live } = await supabase
    .from('lives')
    .select('id, artist_id, status, min_tier')
    .eq('id', input.liveId)
    .single()
  if (!live) return { error: 'Live não encontrada.' }
  if (live.status !== 'live') return { error: 'Esta live não está no ar.' }

  if (live.min_tier) {
    // admin/dono/empresário sempre passam; senão, checa a assinatura ativa.
    const [{ data: profile }, { data: artist }, { data: manager }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('artists').select('owner_id').eq('id', live.artist_id).single(),
      supabase.from('managers').select('id').eq('user_id', user.id).eq('artist_id', live.artist_id).maybeSingle(),
    ])
    const isStaff = profile?.role === 'admin' || artist?.owner_id === user.id || Boolean(manager)
    if (!isStaff) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, plan:plans(tier)')
        .eq('user_id', user.id)
        .eq('artist_id', live.artist_id)
        .eq('status', 'active')
        .maybeSingle()
      const userTier = (sub?.plan as { tier?: string } | null)?.tier ?? null
      if (!tierAllows(userTier, live.min_tier)) return { error: 'Sua assinatura não dá acesso a esta live.' }
    }
  }

  const author =
    (user.user_metadata?.display_name as string | undefined)?.trim() ||
    (user.email?.split('@')[0] ?? 'Fã')

  const { error: dbError } = await supabase.from('live_messages').insert({
    live_id: input.liveId,
    artist_id: live.artist_id,
    user_id: user.id,
    author: author.slice(0, 60),
    body,
  })
  if (dbError) {
    console.log('[v0] sendLiveMessage error:', dbError.message)
    return { error: 'Não foi possível enviar a mensagem.' }
  }
  return { success: true }
}

// Limpa todo o chat de uma live (moderação). Restrito a admin/dono/empresário.
export async function clearLiveMessages(liveId: string, artistId: string) {
  const { supabase, error } = await requireManager(artistId)
  if (error) return { error }
  const { error: dbError } = await supabase
    .from('live_messages')
    .delete()
    .eq('live_id', liveId)
    .eq('artist_id', artistId)
  if (dbError) return { error: 'Não foi possível limpar o chat.' }
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
const MAX_VIDEO_BYTES = 200 * 1024 * 1024
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

// ============ UPLOAD DIRETO (signed URL — cliente sobe direto ao Supabase) ============
// Gera uma URL assinada para o cliente fazer upload direto ao bucket,
// sem o arquivo passar pelo servidor Next.js — elimina a double-hop e é muito mais rápido.
const ALLOWED_DIRECT_TYPES = [
  'video/mp4', 'video/webm', 'video/quicktime',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
]

export async function createDirectUploadUrl(input: {
  artistId: string
  kind: string
  fileType: string
  fileSizeBytes: number
}) {
  const { supabase, error, slug } = await requireManager(input.artistId)
  if (error) return { error }

  if (!ALLOWED_DIRECT_TYPES.includes(input.fileType)) {
    return { error: 'Tipo de arquivo não permitido.' }
  }

  const isVideo = input.fileType.startsWith('video/')
  const maxBytes = isVideo ? 200 * 1024 * 1024 : 5 * 1024 * 1024
  if (input.fileSizeBytes > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(0)
    return { error: `Arquivo muito grande (máx. ${mb}MB).` }
  }

  const rawExt  = input.fileType.split('/')[1]
  const ext     = rawExt === 'jpeg' ? 'jpg' : rawExt === 'quicktime' ? 'mov' : rawExt
  const kind    = input.kind.slice(0, 20).replace(/[^a-z0-9-]/gi, '-')
  const path    = `${slug}/${kind}-${Date.now()}.${ext}`

  const { data, error: signErr } = await supabase.storage
    .from('artist-media')
    .createSignedUploadUrl(path)

  if (signErr || !data) {
    console.log('[signed-upload] error:', signErr?.message)
    return { error: 'Não foi possível gerar o link de upload. Tente novamente.' }
  }

  // public URL que será salva no banco após o upload
  const { data: { publicUrl } } = supabase.storage.from('artist-media').getPublicUrl(path)

  return {
    signedUrl: data.signedUrl,
    token:     data.token,
    path,
    publicUrl,
  }
}
