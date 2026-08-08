'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Marca o onboarding como visto na tabela do usuário (profiles), caso ele
 * esteja autenticado e a coluna exista. É seguro chamar sem login: apenas
 * ignora silenciosamente. O status principal também é guardado no localStorage
 * do cliente.
 */
export async function markOnboardingSeen() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { ok: true, persisted: false as const }

    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    // Se a coluna ainda não existir (script SQL não rodado), não quebra o fluxo.
    if (error) return { ok: true, persisted: false as const }

    return { ok: true, persisted: true as const }
  } catch {
    return { ok: true, persisted: false as const }
  }
}
