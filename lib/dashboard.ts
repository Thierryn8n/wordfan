import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resolveTheme } from '@/lib/artist-theme'
import type { Artist } from '@/lib/types'

/**
 * Resolve o artista do usuário logado (ou o primeiro, se admin).
 * Envolvido em `cache()` para deduplicar entre o layout e as páginas
 * dentro da mesma requisição — uma única ida ao banco.
 */
export const getDashboardArtist = cache(async (nextPath: string) => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  let query = supabase.from('artists').select('*')
  if (profile?.role !== 'admin') query = query.eq('owner_id', user.id)
  const { data } = await query.limit(1).maybeSingle()

  return {
    artist: (data as Artist | null) ?? null,
    role: profile?.role ?? 'user',
    supabase,
    userId: user.id,
  }
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
