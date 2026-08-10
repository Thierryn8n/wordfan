'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/admin-guard'
import { createServiceClient, isServiceRoleConfigured } from '@/lib/supabase/admin'

const ROLES = ['fan', 'artist', 'admin'] as const
type Role = (typeof ROLES)[number]

/** Cria um usuário completo (auth + profile). Requer service role. */
export async function createUser(input: {
  email: string
  password: string
  displayName: string
  role: Role
}) {
  const { error } = await assertAdmin()
  if (error) return { error }
  if (!isServiceRoleConfigured()) {
    return { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada — não é possível criar usuários.' }
  }

  const email = input.email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'E-mail inválido.' }
  if (input.password.length < 8) return { error: 'A senha precisa ter ao menos 8 caracteres.' }
  const displayName = input.displayName.trim().slice(0, 80)
  if (!displayName) return { error: 'Nome obrigatório.' }
  const role: Role = ROLES.includes(input.role) ? input.role : 'fan'

  const admin = createServiceClient()
  const { data, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (authError || !data.user) {
    console.log('[v0] createUser auth error:', authError?.message)
    return { error: authError?.message ?? 'Não foi possível criar o usuário.' }
  }

  // O trigger de profiles pode já ter criado a linha — upsert cobre os dois casos.
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: data.user.id, display_name: displayName, role }, { onConflict: 'id' })
  if (profileError) {
    console.log('[v0] createUser profile error:', profileError.message)
    return { error: 'Usuário criado, mas o perfil falhou: ' + profileError.message }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

/** Atualiza nome, avatar, XP e papel do usuário. */
export async function updateUser(input: {
  id: string
  displayName: string
  avatarUrl: string
  role: Role
  xp: number
}) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }

  const displayName = input.displayName.trim().slice(0, 80)
  if (!displayName) return { error: 'Nome obrigatório.' }
  const role: Role = ROLES.includes(input.role) ? input.role : 'fan'
  const xp = Number.isFinite(input.xp) ? Math.max(0, Math.trunc(input.xp)) : 0

  const { error: dbError } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      avatar_url: input.avatarUrl.trim() || null,
      role,
      xp,
    })
    .eq('id', input.id)

  if (dbError) {
    console.log('[v0] updateUser error:', dbError.message)
    return { error: 'Não foi possível salvar o usuário.' }
  }

  revalidatePath('/admin/users')
  return { success: true }
}

/** Redefine a senha de um usuário. Requer service role. */
export async function resetUserPassword(id: string, password: string) {
  const { error } = await assertAdmin()
  if (error) return { error }
  if (!isServiceRoleConfigured()) return { error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }
  if (password.length < 8) return { error: 'A senha precisa ter ao menos 8 caracteres.' }

  const admin = createServiceClient()
  const { error: authError } = await admin.auth.admin.updateUserById(id, { password })
  if (authError) return { error: authError.message }
  return { success: true }
}

/** Remove o usuário do auth e o profile em cascata. */
export async function deleteUser(id: string) {
  const { supabase, user, error } = await assertAdmin()
  if (error) return { error }
  if (user && user.id === id) return { error: 'Você não pode excluir a própria conta.' }

  if (isServiceRoleConfigured()) {
    const admin = createServiceClient()
    const { error: authError } = await admin.auth.admin.deleteUser(id)
    if (authError) {
      console.log('[v0] deleteUser auth error:', authError.message)
      return { error: authError.message }
    }
    revalidatePath('/admin/users')
    return { success: true }
  }

  const { error: dbError } = await supabase.from('profiles').delete().eq('id', id)
  if (dbError) return { error: 'Não foi possível excluir o perfil.' }
  revalidatePath('/admin/users')
  return { success: true }
}
