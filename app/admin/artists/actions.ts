'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'

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

/**
 * Cria/convida o usuário do artista via service-role e retorna o id + link de
 * convite. O link permite ao artista definir a própria senha em /auth/set-password.
 * Se o email já existir, gera um link de recuperação em vez de falhar.
 */
async function inviteArtistUser(email: string, displayName: string) {
  const admin = createServiceClient()
  const base = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  const redirectTo = base
    ? `${base}${base.includes('?') ? '&' : '?'}next=${encodeURIComponent('/auth/set-password')}`
    : undefined

  const metadata = { role: 'artist', display_name: displayName, must_set_password: true }

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: metadata, redirectTo },
  })

  if (!error && data?.user) {
    return { userId: data.user.id, link: data.properties?.action_link ?? null, error: null as string | null }
  }

  // Email já cadastrado: buscar usuário e gerar link de recuperação
  const msg = (error?.message ?? '').toLowerCase()
  if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
    const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!existing) return { userId: null, link: null, error: 'Email já cadastrado, mas não localizado.' }
    const { data: rec } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
    return { userId: existing.id, link: rec?.properties?.action_link ?? null, error: null }
  }

  console.log('[v0] invite error:', error?.message)
  return { userId: null, link: null, error: 'Não foi possível convidar o artista.' }
}

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

export async function createArtist({
  name,
  email,
  genre,
  city,
  state,
}: {
  name: string
  email: string
  genre: string
  city: string
  state: string
}) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }
  if (!isServiceRoleConfigured()) return { error: SERVICE_KEY_ERROR }

  const cleanName = name.trim()
  if (!cleanName || cleanName.length > 80) return { error: 'Nome inválido (máx. 80 caracteres).' }

  const cleanEmail = email.trim().toLowerCase()
  if (!EMAIL_RE.test(cleanEmail)) return { error: 'Informe um email válido para o artista acessar o painel.' }

  const baseSlug = slugify(cleanName)
  if (!baseSlug) return { error: 'Nome inválido para gerar o link.' }

  // Garantir slug único
  const { data: existing } = await supabase.from('artists').select('slug').like('slug', `${baseSlug}%`)
  const taken = new Set((existing ?? []).map((r) => r.slug))
  let slug = baseSlug
  let i = 2
  while (taken.has(slug)) {
    slug = `${baseSlug}-${i}`
    i++
  }

  // 1) Cria/convida o usuário do artista e obtém o link de definição de senha
  const invite = await inviteArtistUser(cleanEmail, cleanName)
  if (invite.error || !invite.userId) return { error: invite.error ?? 'Falha ao convidar o artista.' }

  // 2) Define o role 'artist' no perfil (service-role, ignora RLS)
  const admin = createServiceClient()
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: invite.userId, role: 'artist', display_name: cleanName }, { onConflict: 'id' })
  if (profileError) console.log('[v0] set artist role error:', profileError.message)

  // 3) Cria o artista já vinculado ao dono (owner_id)
  const { data: artist, error } = await supabase
    .from('artists')
    .insert({
      name: cleanName,
      slug,
      owner_id: invite.userId,
      genre: genre.trim().slice(0, 60) || null,
      city: city.trim().slice(0, 60) || null,
      state: state.trim().slice(0, 2).toUpperCase() || null,
      bio: null,
      followers_count: 0,
      is_featured: false,
      is_live: false,
      social_links: {},
      commission_pct: 20,
      tool_plan: 'basic',
      theme: {},
      about: {},
    })
    .select('id, slug')
    .single()

  if (error || !artist) {
    console.log('[v0] create artist error:', error?.message)
    return { error: 'Não foi possível criar o artista.' }
  }

  // 4) Criar os 4 planos padrão do fan club
  const { error: plansError } = await supabase.from('plans').insert([
    { artist_id: artist.id, tier: 'bronze', name: 'Bronze', price_cents: 990, benefits: ['Feed exclusivo', 'Badge de fã'] },
    { artist_id: artist.id, tier: 'silver', name: 'Prata', price_cents: 1990, benefits: ['Tudo do Bronze', 'Lives exclusivas'] },
    { artist_id: artist.id, tier: 'gold', name: 'Ouro', price_cents: 3990, benefits: ['Tudo do Prata', 'Pré-venda', 'Sorteios'] },
    { artist_id: artist.id, tier: 'platinum', name: 'Platina', price_cents: 7990, benefits: ['Tudo do Ouro', 'Encontro virtual', 'Kit exclusivo'] },
  ])
  if (plansError) console.log('[v0] create plans error:', plansError.message)

  revalidatePath('/admin/artists')
  revalidatePath('/home')
  revalidatePath('/search')
  return { success: true, slug: artist.slug, inviteLink: invite.link, email: cleanEmail }
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
