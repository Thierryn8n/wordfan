'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'
import { encodeArtistToken } from '@/lib/artist-link'

const SERVICE_KEY_ERROR = 'Configure a variável SUPABASE_SERVICE_ROLE_KEY no projeto para usar este recurso.'

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

async function siteOrigin() {
  const hdrs = await headers()
  const proto = hdrs.get('x-forwarded-proto') ?? 'https'
  const host = hdrs.get('host') ?? ''
  return `${proto}://${host}`
}

/**
 * Cria o ACESSO do artista: o admin informa apenas email e senha. O usuário é
 * criado já com a senha (login imediato) e com um artista provisório vinculado.
 * O perfil completo é preenchido depois — pelo próprio admin ou pelo artista,
 * via o link retornado. Retorna também o link permanente criptografado do
 * perfil (`/a/<token>`).
 */
export async function createArtist({ email, password }: { email: string; password: string }) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }
  if (!isServiceRoleConfigured()) return { error: SERVICE_KEY_ERROR }

  const cleanEmail = email.trim().toLowerCase()
  if (!EMAIL_RE.test(cleanEmail)) return { error: 'Informe um email válido para o artista acessar o painel.' }
  if (password.length < 8) return { error: 'A senha deve ter pelo menos 8 caracteres.' }

  const admin = createServiceClient()

  // 1) Cria o usuário do artista já com a senha (email confirmado = login direto)
  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: cleanEmail,
    password,
    email_confirm: true,
    user_metadata: { role: 'artist' },
  })

  if (createUserError || !createdUser?.user) {
    const msg = (createUserError?.message ?? '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      return { error: 'Já existe uma conta com esse email. Use outro email para o artista.' }
    }
    console.log('[v0] create artist user error:', createUserError?.message)
    return { error: 'Não foi possível criar o acesso do artista.' }
  }

  const userId = createdUser.user.id

  // 2) Define o role 'artist' no perfil (service-role, ignora RLS)
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: userId, role: 'artist' }, { onConflict: 'id' })
  if (profileError) console.log('[v0] set artist role error:', profileError.message)

  // 3) Slug provisório único a partir do email (o artista ajusta depois)
  const baseSlug = slugify(cleanEmail.split('@')[0]) || 'artista'
  const { data: existing } = await admin.from('artists').select('slug').like('slug', `${baseSlug}%`)
  const taken = new Set((existing ?? []).map((r) => r.slug))
  let slug = baseSlug
  let i = 2
  while (taken.has(slug)) {
    slug = `${baseSlug}-${i}`
    i++
  }

  const provisionalName = cleanEmail.split('@')[0].replace(/[._-]+/g, ' ').trim().slice(0, 80) || 'Novo artista'

  // 4) Cria o artista provisório, marcado como pendente de preenchimento
  const { data: artist, error } = await admin
    .from('artists')
    .insert({
      name: provisionalName,
      slug,
      owner_id: userId,
      bio: null,
      followers_count: 0,
      is_featured: false,
      is_live: false,
      social_links: {},
      commission_pct: 20,
      tool_plan: 'basic',
      theme: {},
      about: { setup_pending: true },
    })
    .select('id, slug')
    .single()

  if (error || !artist) {
    console.log('[v0] create artist error:', error?.message)
    return { error: 'Não foi possível criar o artista.' }
  }

  // 5) Criar os 4 planos padrão do fan club
  const { error: plansError } = await admin.from('plans').insert([
    { artist_id: artist.id, tier: 'bronze', name: 'Bronze', price_cents: 990, benefits: ['Feed exclusivo', 'Badge de fã'] },
    { artist_id: artist.id, tier: 'silver', name: 'Prata', price_cents: 1990, benefits: ['Lives exclusivas'] },
    { artist_id: artist.id, tier: 'gold', name: 'Ouro', price_cents: 3990, benefits: ['Pré-venda', 'Sorteios'] },
    { artist_id: artist.id, tier: 'platinum', name: 'Platina', price_cents: 7990, benefits: ['Encontro virtual', 'Kit exclusivo'] },
  ])
  if (plansError) console.log('[v0] create plans error:', plansError.message)

  const origin = await siteOrigin()
  const token = encodeArtistToken(artist.id)
  const profileUrl = `${origin}/a/${token}`

  revalidatePath('/admin/artists')
  revalidatePath('/home')
  revalidatePath('/search')
  return { success: true, slug: artist.slug, email: cleanEmail, profileUrl }
}

export async function deleteArtist({ artistId }: { artistId: string }) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  // Cascade remove planos, posts, shows, lives, galeria, vídeos, assinaturas e transações
  const { error } = await supabase.from('artists').delete().eq('id', artistId)

  if (error) {
    console.log('[v0] delete artist error:', error.message)
    return { error: 'Não foi possível excluir o artista.' }
  }

  revalidatePath('/admin/artists')
  revalidatePath('/home')
  revalidatePath('/search')
  return { success: true }
}
