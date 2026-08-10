import 'server-only'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Indica se a service role key está configurada no ambiente. Use isto antes
 * de chamar createServiceClient() em código que precisa degradar graciosamente
 * (páginas/listas) em vez de derrubar a página inteira.
 */
export function isServiceRoleConfigured() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

/**
 * Service-role client. NUNCA importar em código client-side.
 * Usa a service role key para operações administrativas (criar usuários,
 * enviar convites, ajustar roles). Ignora RLS — use apenas em Server Actions
 * já protegidas por verificação de admin.
 */
export function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.')
  }
  return createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
