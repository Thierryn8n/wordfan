'use server'

import { revalidatePath } from 'next/cache'
import { assertAdmin } from '@/lib/admin-guard'

type Audience = 'all' | 'role' | 'artist' | 'user'

/**
 * Envia uma notificação. O público pode ser toda a base, um papel,
 * os assinantes ativos de um artista ou um usuário específico.
 */
export async function sendNotification(input: {
  title: string
  body: string
  audience: Audience
  role?: 'fan' | 'artist' | 'admin'
  artistId?: string
  userId?: string
}) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }

  const title = input.title.trim().slice(0, 120)
  if (!title) return { error: 'Título obrigatório.' }
  const body = input.body.trim().slice(0, 500)

  let recipients: string[] = []

  if (input.audience === 'user') {
    if (!input.userId) return { error: 'Selecione um usuário.' }
    recipients = [input.userId]
  } else if (input.audience === 'artist') {
    if (!input.artistId) return { error: 'Selecione um artista.' }
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('artist_id', input.artistId)
      .eq('status', 'active')
    recipients = Array.from(new Set((data ?? []).map((s) => s.user_id)))
  } else if (input.audience === 'role') {
    const { data } = await supabase.from('profiles').select('id').eq('role', input.role ?? 'fan')
    recipients = (data ?? []).map((p) => p.id)
  } else {
    const { data } = await supabase.from('profiles').select('id')
    recipients = (data ?? []).map((p) => p.id)
  }

  if (recipients.length === 0) return { error: 'Nenhum destinatário encontrado para este público.' }

  const rows = recipients.map((user_id) => ({ user_id, title, body: body || null, read: false }))
  const { error: dbError } = await supabase.from('notifications').insert(rows)
  if (dbError) {
    console.log('[v0] sendNotification error:', dbError.message)
    return { error: 'Não foi possível enviar as notificações.' }
  }

  revalidatePath('/admin/notifications')
  revalidatePath('/notifications')
  return { success: true, sent: recipients.length }
}

export async function updateNotification(input: { id: string; title: string; body: string }) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }

  const title = input.title.trim().slice(0, 120)
  if (!title) return { error: 'Título obrigatório.' }

  const { error: dbError } = await supabase
    .from('notifications')
    .update({ title, body: input.body.trim().slice(0, 500) || null })
    .eq('id', input.id)
  if (dbError) return { error: 'Não foi possível salvar.' }

  revalidatePath('/admin/notifications')
  revalidatePath('/notifications')
  return { success: true }
}

export async function deleteNotification(id: string) {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: dbError } = await supabase.from('notifications').delete().eq('id', id)
  if (dbError) return { error: 'Não foi possível excluir.' }
  revalidatePath('/admin/notifications')
  revalidatePath('/notifications')
  return { success: true }
}

/** Remove todas as notificações já lidas — limpeza de base. */
export async function purgeReadNotifications() {
  const { supabase, error } = await assertAdmin()
  if (error) return { error }
  const { error: dbError } = await supabase.from('notifications').delete().eq('read', true)
  if (dbError) return { error: 'Não foi possível limpar.' }
  revalidatePath('/admin/notifications')
  return { success: true }
}
