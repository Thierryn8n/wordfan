'use server'

import { createClient } from '@/lib/supabase/server'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Artista (ou admin) altera o próprio email de acesso. */
export async function updateArtistEmail(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return { error: 'Informe um email válido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  if (email === user.email?.toLowerCase()) return { error: 'Este já é o seu email atual.' }

  const { error } = await supabase.auth.updateUser({ email })
  if (error) {
    console.log('[v0] update email error:', error.message)
    return { error: 'Não foi possível alterar o email. Ele pode já estar em uso.' }
  }
  return { ok: 'Email atualizado. Confirme pelo link enviado para o novo endereço.' }
}

/** Artista (ou admin) altera a própria senha de acesso. */
export async function updateArtistPassword(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; ok?: string }> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 8) return { error: 'A senha deve ter pelo menos 8 caracteres.' }
  if (password !== confirm) return { error: 'As senhas não coincidem.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.log('[v0] update password error:', error.message)
    return { error: 'Não foi possível alterar a senha. Tente novamente.' }
  }
  return { ok: 'Senha atualizada com sucesso.' }
}
