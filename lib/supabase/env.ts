/**
 * Resolve a configuração pública do Supabase a partir dos vários nomes de
 * variável que podem existir neste projeto.
 *
 * Neste ambiente a anon key está publicada sob o nome `JWT` (o payload do
 * token tem `"role":"anon"`), então ela entra na cadeia de fallback junto com
 * os nomes padrão do Supabase.
 *
 * Atenção: estas funções leem variáveis sem prefixo `NEXT_PUBLIC_`, portanto
 * só funcionam no servidor. O client do navegador (client.ts) resolve a sua
 * própria config a partir de variáveis `NEXT_PUBLIC_*`.
 */
export function getSupabaseUrl() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    process.env.SUPABASE_URL_2
  if (!url) {
    throw new Error(
      'URL do Supabase não configurada (esperado NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL).',
    )
  }
  return url
}

export function getSupabaseAnonKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.JWT ??
    process.env.JWT_2 ??
    // Último recurso: nenhuma anon key foi injetada no ambiente. A service
    // role key é usada apenas como `apikey` para que os clients SSR
    // (server-only) consigam funcionar. NUNCA use este valor no navegador.
    // Assim que uma anon key real for adicionada (NEXT_PUBLIC_SUPABASE_ANON_KEY),
    // ela tem prioridade e este fallback deixa de ser usado.
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY_2
  if (!key) {
    throw new Error(
      'Chave do Supabase não configurada (esperado NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, JWT ou SUPABASE_SERVICE_ROLE_KEY).',
    )
  }
  return key
}

/**
 * Indica se uma anon key pública real está disponível. Quando `false`, o client
 * do navegador (client.ts) não consegue operar e os clients SSR estão usando a
 * service role como fallback — adicione NEXT_PUBLIC_SUPABASE_ANON_KEY para
 * corrigir isso corretamente.
 */
export function hasPublicAnonKey() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.JWT ??
      process.env.JWT_2,
  )
}
