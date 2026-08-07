'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

export async function createArtist({ name, genre, city, state }: { name: string; genre: string; city: string; state: string }) {
  const { supabase, error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const cleanName = name.trim()
  if (!cleanName || cleanName.length > 80) return { error: 'Nome inválido (máx. 80 caracteres).' }

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

  const { data: artist, error } = await supabase
    .from('artists')
    .insert({
      name: cleanName,
      slug,
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

  // Criar os 4 planos padrão do fan club
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
  return { success: true, slug: artist.slug }
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
