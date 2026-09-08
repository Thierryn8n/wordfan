import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveTheme } from '@/lib/artist-theme'
import type { Artist } from '@/lib/types'

/** Cookie onde fica o slug do artista que o admin está visualizando no painel. */
export const DASHBOARD_ARTIST_COOKIE = 'wf_admin_artist'

/**
 * Resolve o artista do usuário logado (ou o selecionado, se admin).
 * Envolvido em `cache()` para deduplicar entre o layout e as páginas
 * dentro da mesma requisição — uma única ida ao banco.
 *
 * Admin: usa o slug explícito (se passado), senão o cookie de seleção,
 * senão o primeiro artista. Se a seleção não existir mais, cai no primeiro.
 */
export const getDashboardArtist = cache(async (nextPath: string, artistSlug?: string) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role ?? 'user'

  let artist: Artist | null = null

  if (role === 'admin') {
    const store = await cookies()
    const selected = artistSlug ?? store.get(DASHBOARD_ARTIST_COOKIE)?.value
    if (selected) {
      const { data } = await supabase.from('artists').select('*').eq('slug', selected).maybeSingle()
      artist = (data as Artist | null) ?? null
    }
    // Sem seleção (ou seleção inexistente): primeiro artista por nome.
    if (!artist) {
      const { data } = await supabase.from('artists').select('*').order('name').limit(1).maybeSingle()
      artist = (data as Artist | null) ?? null
    }
  } else {
    // Usuário normal só vê seu próprio artista.
    const { data } = await supabase.from('artists').select('*').eq('owner_id', user.id).maybeSingle()
    artist = (data as Artist | null) ?? null
  }

  return {
    artist,
    role,
    supabase,
    userId: user.id,
  }
})

/**
 * Busca todos os artistas (para admin selecionar)
 */
export const getAllArtists = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return []

  const { data } = await supabase.from('artists').select('*').order('name')
  return (data as Artist[]) ?? []
})

/** Agrupa valores por mês (últimos `months` meses) a partir de um campo de data. */
export function bucketByMonth<T>(
  rows: T[],
  dateField: keyof T,
  valueFn: (row: T) => number,
  months = 6,
) {
  const now = new Date()
  const buckets: { key: string; label: string; value: number }[] = []
  const labels = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: labels[d.getMonth()],
      value: 0,
    })
  }

  for (const row of rows) {
    const raw = row[dateField] as unknown as string | null
    if (!raw) continue
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) continue
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = buckets.find((b) => b.key === key)
    if (bucket) bucket.value += valueFn(row)
  }

  return buckets.map(({ label, value }) => ({ month: label, value }))
}

export { resolveTheme }
