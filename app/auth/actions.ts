'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type AuthError = { code?: string; status?: number }

function loginErrorMessage(error: AuthError): string {
  const { code, status } = error
  if (code === 'email_not_confirmed') {
    return 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.'
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Muitas tentativas. Aguarde um momento e tente de novo.'
  }
  if (code === 'invalid_credentials') {
    return 'E-mail ou senha inválidos.'
  }
  return 'Algo deu errado. Tente novamente.'
}

function signUpErrorMessage(error: AuthError): string {
  const { code, status } = error
  if (code === 'weak_password') return 'Senha muito fraca. Use pelo menos 6 caracteres.'
  if (code === 'email_address_invalid') return 'Endereço de e-mail inválido. Use um e-mail real.'
  if (code === 'over_request_rate_limit' || status === 429) return 'Muitas tentativas. Aguarde um momento e tente de novo.'
  if (code === 'user_already_exists') return 'Não foi possível criar a conta com esses dados.'
  return 'Algo deu errado. Tente novamente.'
}

async function destForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const { data: prof } = await supabase.from('profiles').select('role').eq('id', userId).single()
  if (prof?.role === 'empresario') return '/manager'
  if (prof?.role === 'admin') return '/admin'
  if (prof?.role === 'artist') return '/dashboard'
  return '/home'
}

export async function loginAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; dest?: string }> {
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '')

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: loginErrorMessage(error as AuthError) }

  if (next) return { dest: next }

  const userId = data.user?.id
  const dest = userId ? await destForUser(supabase, userId) : '/home'
  return { dest }
}

export async function signUpAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; dest?: string }> {
  const displayName = String(formData.get('displayName') ?? '')
  const email = String(formData.get('email') ?? '')
  const password = String(formData.get('password') ?? '')

  const hdrs = await headers()
  const origin = hdrs.get('origin') ?? `https://${hdrs.get('host') ?? ''}`
  const emailRedirectTo =
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${origin}/auth/callback`

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: { display_name: displayName },
    },
  })
  if (error) return { error: signUpErrorMessage(error as AuthError) }

  return { dest: '/auth/sign-up-success' }
}

export async function getSetPasswordSession(): Promise<{ hasSession: boolean; email: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { hasSession: Boolean(user), email: user?.email ?? null }
}

export async function setPasswordAction(
  _prev: unknown,
  formData: FormData,
): Promise<{ error?: string; dest?: string }> {
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < 8) return { error: 'A senha deve ter pelo menos 8 caracteres.' }
  if (password !== confirm) return { error: 'As senhas não coincidem.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password,
    data: { must_set_password: false },
  })
  if (error) {
    return {
      error: 'Não foi possível salvar a senha. O link pode ter expirado — peça um novo convite.',
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const dest = user ? await destForUser(supabase, user.id) : '/dashboard'
  return { dest }
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
}
