export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export const TIER_LABELS: Record<Tier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
}

export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum']

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: 'fan' | 'artist' | 'admin'
  xp: number
  created_at: string
}

export interface Artist {
  id: string
  owner_id: string | null
  name: string
  slug: string
  bio: string | null
  genre: string | null
  city: string | null
  state: string | null
  banner_url: string | null
  avatar_url: string | null
  social_links: Record<string, string>
  followers_count: number
  is_featured: boolean
  is_live: boolean
  created_at: string
  theme: Record<string, unknown>
  commission_pct: number
  tool_plan: 'basic' | 'pro' | 'premium'
}

export interface Transaction {
  id: string
  subscription_id: string | null
  artist_id: string
  user_id: string
  amount_cents: number
  platform_fee_cents: number
  artist_net_cents: number
  created_at: string
}

export interface Plan {
  id: string
  artist_id: string
  tier: Tier
  name: string
  price_cents: number
  benefits: string[]
}

export interface Subscription {
  id: string
  user_id: string
  artist_id: string
  plan_id: string
  status: 'active' | 'canceled'
  started_at: string
  plan?: Plan
  artist?: Artist
}

export interface Post {
  id: string
  artist_id: string
  type: 'text' | 'image' | 'video' | 'poll'
  title: string | null
  content: string | null
  media_url: string | null
  is_exclusive: boolean
  min_tier: Tier | null
  likes_count: number
  created_at: string
  artist?: Artist
}

export interface Show {
  id: string
  artist_id: string
  title: string
  venue: string | null
  city: string | null
  state: string | null
  starts_at: string
  status: 'scheduled' | 'done' | 'canceled'
}

export interface Live {
  id: string
  artist_id: string
  title: string
  scheduled_at: string
  status: 'scheduled' | 'live' | 'ended'
  min_tier: Tier | null
  artist?: Artist
}

export interface GalleryItem {
  id: string
  artist_id: string
  type: 'photo' | 'video'
  url: string
  album: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  read: boolean
  created_at: string
}

export function formatPrice(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}
