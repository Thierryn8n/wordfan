'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Atualiza o próprio perfil do usuário logado (nome + avatar). */
export async function updateMyProfile(input: { displayName: string; avatarUrl: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const displayName = input.displayName.trim().slice(0, 60)
  if (!displayName) return { error: 'Informe um nome de exibição.' }

  const avatarUrl = input.avatarUrl.trim().slice(0, 500) || null

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) {
    console.log('[v0] updateMyProfile error:', error.message)
    return { error: 'Não foi possível salvar. Tente novamente.' }
  }

  // Mantém o metadata do auth em sincronia (usado em alguns fluxos)
  await supabase.auth.updateUser({ data: { display_name: displayName } })

  revalidatePath('/profile')
  return { success: true }
}

/** Upload de avatar do próprio usuário para o bucket público. */
export async function uploadMyAvatar(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Imagem muito grande (máx. 5MB).' }
  if (!ALLOWED_TYPES.includes(file.type)) return { error: 'Formato inválido (PNG, JPG, WebP ou GIF).' }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `avatars/${user.id}-${Date.now()}.${ext}`

  const { error: upError } = await supabase.storage.from('artist-media').upload(path, file, {
    contentType: file.type,
    upsert: true,
  })
  if (upError) {
    console.log('[v0] avatar upload error:', upError.message)
    return { error: 'Falha no upload. Você pode colar a URL de uma imagem no lugar.' }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('artist-media').getPublicUrl(path)
  return { url: publicUrl }
}

/** Exclui permanentemente a conta do próprio usuário (auth + perfil). */
export async function deleteMyAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const admin = createServiceClient()
  // Remove o perfil (as demais tabelas em cascata via FK on delete)
  await admin.from('profiles').delete().eq('id', user.id)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) {
    console.log('[v0] deleteMyAccount error:', error.message)
    return { error: 'Não foi possível excluir a conta.' }
  }

  await supabase.auth.signOut()
  return { success: true }
}
