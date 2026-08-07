'use server'

import { createClient } from '@/lib/supabase/server'

export async function trackBannerClick(id: string) {
  const supabase = await createClient()
  await supabase.rpc('increment_banner_click', { p_id: id })
}

export async function trackBannerImpressions(ids: string[]) {
  if (ids.length === 0) return
  const supabase = await createClient()
  await supabase.rpc('increment_banner_impressions', { p_ids: ids })
}
