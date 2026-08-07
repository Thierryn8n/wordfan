import { createClient } from '@/lib/supabase/server'
import type { Artist, Live, Plan, Post, Show, Subscription, GalleryItem, Story, Tier, Video } from '@/lib/types'
import { TIER_ORDER } from '@/lib/types'

export async function getArtists() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('artists')
    .select('*')
    .order('followers_count', { ascending: false })
  return (data ?? []) as Artist[]
}

export async function getArtistBySlug(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('artists').select('*').eq('slug', slug).single()
  return data as Artist | null
}

export async function getArtistPlans(artistId: string) {
  const supabase = await createClient()
  const { data } = await supabase.from('plans').select('*').eq('artist_id', artistId)
  const plans = (data ?? []) as Plan[]
  return plans.sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier))
}

export async function getArtistPosts(artistId: string) {
  const supabase = await createClient()
  const [{ data: visible }, { data: teasers }] = await Promise.all([
    supabase.from('posts').select('*').eq('artist_id', artistId),
    supabase.rpc('get_post_teasers', { p_artist_id: artistId }),
  ])
  const visibleIds = new Set((visible ?? []).map((p: { id: string }) => p.id))
  const lockedPosts = ((teasers ?? []) as Partial<Post>[])
    .filter((t) => t.id && !visibleIds.has(t.id))
    .map((t) => ({
      ...t,
      content: null,
      media_url: null,
      locked: true,
    }))
  const all = [...((visible ?? []) as Post[]), ...(lockedPosts as (Post & { locked: boolean })[])]
  return all.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  ) as (Post & { locked?: boolean })[]
}

export async function getArtistShows(artistId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shows')
    .select('*')
    .eq('artist_id', artistId)
    .eq('status', 'scheduled')
    .order('starts_at', { ascending: true })
  return (data ?? []) as Show[]
}

export async function getArtistGallery(artistId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
  return (data ?? []) as GalleryItem[]
}

export async function getArtistStories(artistId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('stories')
    .select('*')
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
  return (data ?? []) as Story[]
}

export async function getArtistVideos(artistId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('videos')
    .select('*')
    .eq('artist_id', artistId)
    .order('views_count', { ascending: false })
  return (data ?? []) as Video[]
}

export async function getArtistLives(artistId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('lives')
    .select('*')
    .eq('artist_id', artistId)
    .in('status', ['scheduled', 'live'])
    .order('scheduled_at', { ascending: true })
  return (data ?? []) as Live[]
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getUserSubscription(artistId: string): Promise<(Subscription & { plan: Plan }) | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('artist_id', artistId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  return (data as (Subscription & { plan: Plan }) | null) ?? null
}

export function tierRank(tier: Tier | null | undefined) {
  if (!tier) return 0
  return TIER_ORDER.indexOf(tier) + 1
}

export function canAccess(userTier: Tier | null | undefined, minTier: Tier | null | undefined) {
  if (!minTier) return true
  return tierRank(userTier) >= tierRank(minTier)
}
