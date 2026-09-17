import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getCookieOptions, getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      // O preview do v0 roda em um iframe cross-origin sobre HTTPS. Cookies
      // SameSite=Lax são bloqueados nesse contexto, o que derruba a sessão e
      // causa loop de login. SameSite=None + Secure permite que o cookie seja
      // aceito dentro do iframe. Em dev localhost (http), caímos para Lax sem
      // secure para o cookie ainda funcionar.
      cookieOptions: getCookieOptions(),
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // The "setAll" method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  )
}
