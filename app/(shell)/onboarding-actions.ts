'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

export interface OnboardingResult {
  ok: boolean
  error?: string
}

const AVATAR_BUCKET = 'avatars'
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB

/** Marca o onboarding como concluído sem alterar dados (opção "deixar para depois"). */
export async function dismissOnboarding(): Promise<OnboardingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirada.' }

  const admin = createServiceClient()
  const { error } = await admin
    .from('profiles')
    .upsert({ id: user.id, onboarded_at: new Date().toISOString() }, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}

export async function completeOnboarding(formData: FormData): Promise<OnboardingResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sessão expirada. Faça login novamente.' }

  const username = (formData.get('username') ?? '').toString().trim()
  const displayName = (formData.get('display_name') ?? '').toString().trim() || username
  const file = formData.get('avatar')

  if (username && !/^[a-zA-Z0-9_.]{3,20}$/.test(username)) {
    return {
      ok: false,
      error: 'Nome de usuário: 3 a 20 caracteres, apenas letras, números, ponto e underline.',
    }
  }

  const admin = createServiceClient()

  if (username) {
    const { data: taken } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .neq('id', user.id)
      .maybeSingle()
    if (taken) return { ok: false, error: 'Esse nome de usuário já está em uso.' }
  }

  let avatarUrl: string | null = null
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_AVATAR_BYTES) {
      return { ok: false, error: 'A imagem deve ter no máximo 5 MB.' }
    }
    if (!file.type.startsWith('image/')) {
      return { ok: false, error: 'Envie um arquivo de imagem válido.' }
    }
    // Garante o bucket público (idempotente).
    await admin.storage.createBucket(AVATAR_BUCKET, { public: true })
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${user.id}/${Date.now()}.${ext || 'jpg'}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    const { error: upErr } = await admin.storage.from(AVATAR_BUCKET).upload(path, bytes, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    })
    if (upErr) return { ok: false, error: 'Falha ao enviar a imagem: ' + upErr.message }
    const { data: pub } = admin.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    avatarUrl = pub.publicUrl
  }

  const update: Record<string, unknown> = {
    id: user.id,
    onboarded_at: new Date().toISOString(),
  }
  if (username) update.username = username
  if (displayName) update.display_name = displayName
  if (avatarUrl) update.avatar_url = avatarUrl

  const { error } = await admin.from('profiles').upsert(update, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/', 'layout')
  return { ok: true }
}
