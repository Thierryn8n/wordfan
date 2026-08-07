'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Você precisa estar logado.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, error: 'Apenas administradores.' }
  return { supabase, error: null as string | null }
}

/**
 * Convida (ou reaproveita) o usuário empresário, define role 'empresario' e o
 * vincula ao artista via tabela managers. Retorna o link de definição de senha.
 */
export async function inviteManager({
  artistId,
  email,
  name,
}: {
  artistId: string
  email: string
  name: string
}) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }

  const cleanEmail = email.trim().toLowerCase()
  const cleanName = name.trim().slice(0, 80)
  if (!EMAIL_RE.test(cleanEmail)) return { error: 'Informe um email válido.' }
  if (!cleanName) return { error: 'Informe o nome do empresário.' }

  const admin = createServiceClient()

  // valida artista
  const { data: artist } = await admin.from('artists').select('id, slug, name').eq('id', artistId).single()
  if (!artist) return { error: 'Artista não encontrado.' }

  const base = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  const redirectTo = base
    ? `${base}${base.includes('?') ? '&' : '?'}next=${encodeURIComponent('/auth/set-password')}`
    : undefined
  const metadata = { role: 'empresario', display_name: cleanName, must_set_password: true }

  let userId: string | null = null
  let link: string | null = null

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: cleanEmail,
    options: { data: metadata, redirectTo },
  })

  if (!error && data?.user) {
    userId = data.user.id
    link = data.properties?.action_link ?? null
  } else {
    const msg = (error?.message ?? '').toLowerCase()
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === cleanEmail)
      if (!existing) return { error: 'Email já cadastrado, mas não localizado.' }
      userId = existing.id
      const { data: rec } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: cleanEmail,
        options: { redirectTo },
      })
      link = rec?.properties?.action_link ?? null
    } else {
      console.log('[v0] invite manager error:', error?.message)
      return { error: 'Não foi possível convidar o empresário.' }
    }
  }

  if (!userId) return { error: 'Falha ao criar o empresário.' }

  // define role (não rebaixa admins existentes)
  const { data: prof } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (prof?.role !== 'admin') {
    await admin
      .from('profiles')
      .upsert({ id: userId, role: 'empresario', display_name: cleanName }, { onConflict: 'id' })
  }

  // vincula ao artista
  const { error: linkError } = await admin
    .from('managers')
    .upsert({ user_id: userId, artist_id: artistId }, { onConflict: 'user_id,artist_id' })
  if (linkError) {
    console.log('[v0] link manager error:', linkError.message)
    return { error: 'Não foi possível vincular o empresário ao artista.' }
  }

  // notifica o empresário in-app
  await admin.from('notifications').insert({
    user_id: userId,
    title: 'Você agora gerencia um artista',
    body: `Você foi adicionado como empresário de ${artist.name} na WordFan. Acesse seu painel.`,
  })

  revalidatePath('/admin/studio')
  revalidatePath('/manager')
  return { success: true, email: cleanEmail, inviteLink: link }
}

export async function removeManager({ artistId, userId }: { artistId: string; userId: string }) {
  const { error: authError } = await requireAdmin()
  if (authError) return { error: authError }
  const admin = createServiceClient()
  const { error } = await admin.from('managers').delete().eq('artist_id', artistId).eq('user_id', userId)
  if (error) return { error: 'Não foi possível remover o empresário.' }
  revalidatePath('/admin/studio')
  return { success: true }
}
