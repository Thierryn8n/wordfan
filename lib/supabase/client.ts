import { createBrowserClient } from '@supabase/ssr'

// O preview do v0 roda o app em um iframe cross-origin sobre HTTPS. Cookies
// SameSite=Lax são bloqueados nesse contexto e causam loop de login, então
// usamos SameSite=None + Secure sempre que houver HTTPS. As env vars
// NEXT_PUBLIC_* aqui são republicadas pelo next.config.mjs a partir de
// SUPABASE_URL e JWT (a anon key deste projeto).
function browserCookieOptions() {
  const isHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:'
  if (isHttps) {
    return { sameSite: 'none' as const, secure: true }
  }
  return { sameSite: 'lax' as const, secure: false }
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: browserCookieOptions(),
    },
  )
}
