'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(input: { displayName: string; avatarUrl?: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  const displayName = input.displayName.trim().slice(0, 60)
  if (displayName.length < 2) return { error: 'O nome deve ter pelo menos 2 caracteres.' }

  const avatarUrl = (input.avatarUrl ?? '').trim().slice(0, 600) || null

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: displayName, avatar_url: avatarUrl })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/profile/edit')
  return { error: null }
}

export async function deleteMyAccount() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Você precisa estar logado.' }

  // Remove os dados do perfil do usuário (RLS: delete own).
  // A linha em auth.users permanece; o vínculo é encerrado ao sair.
  const { error } = await supabase.from('profiles').delete().eq('id', user.id)
  if (error) return { error: error.message }

  await supabase.auth.signOut()
  return { error: null }
}
