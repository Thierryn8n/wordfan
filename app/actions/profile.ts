'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const displayName = (formData.get('display_name') ?? '').toString().trim().slice(0, 60)
  if (displayName.length < 2) return { error: 'O nome deve ter pelo menos 2 caracteres.' }

  const username = (formData.get('username') ?? '').toString().trim().toLowerCase()
  // @username é obrigatório: identidade do usuário em toda interação.
  if (!username || !/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
    return {
      error: 'Escolha um nome de usuário: 3 a 20 caracteres, apenas letras, números, ponto e underline.',
    }
  }

  const admin = createServiceClient()

  // Garante unicidade do @username (case-insensitive).
  const { data: taken } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .neq('id', user.id)
    .maybeSingle()
  if (taken) return { error: 'Esse nome de usuário já está em uso.' }

  // Avatar: upload do dispositivo tem prioridade; senão mantém a URL enviada.
  let avatarUrl: string | null = (formData.get('avatar_url') ?? '').toString().trim().slice(0, 600) || null
  const file = formData.get('avatar')
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_AVATAR_BYTES) return { error: 'A imagem deve ter no máximo 5 MB.' }
    if (!file.type.startsWith('image/')) return { error: 'Envie um arquivo de imagem válido.' }
    await admin.storage.createBucket(AVATAR_BUCKET, { public: true })
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${user.id}/${Date.now()}.${ext || 'jpg'}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error: upErr } = await admin.storage.from(AVATAR_BUCKET).upload(path, bytes, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })
    if (upErr) return { error: 'Falha ao enviar a imagem: ' + upErr.message }
    const { data: pub } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    avatarUrl = pub.publicUrl
  }

  const { error } = await admin
    .from('profiles')
    .update({ display_name: displayName, username, avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/profile/edit')
  return { error: null, avatarUrl }
}

export async function deleteMyAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  // Remove os dados do perfil (RLS: delete own).
  const { error } = await supabase.from('profiles').delete().eq('id', user.id)
  if (error) return { error: error.message }

  // Exclusão total da conta em auth.users (exigência das lojas Apple/Google).
  // Usa o service role; se não estiver configurado, o perfil já foi removido
  // e o vínculo é encerrado ao sair.
  if (isServiceRoleConfigured()) {
    try {
      const admin = createServiceClient()
      const { error: authError } = await admin.auth.admin.deleteUser(user.id)
      if (authError) console.log('[v0] deleteMyAccount auth error:', authError.message)
    } catch (e) {
      console.log('[v0] deleteMyAccount admin unavailable:', (e as Error).message)
    }
  }

  await supabase.auth.signOut()
  return { error: null }
}
