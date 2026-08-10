import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Garante que o visitante é admin. Redireciona quando não for.
 * Devolve o client já autenticado para reaproveitar na página/action.
 */
export async function requireAdmin(nextPath: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/home')

  return { supabase, user }
}

/** Versão para Server Actions: devolve erro em vez de redirecionar. */
export async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, error: 'Não autenticado.' as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return { supabase, error: 'Acesso restrito ao administrador.' as const }

  return { supabase, user, error: null }
}
