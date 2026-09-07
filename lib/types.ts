export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum'

export const TIER_LABELS: Record<Tier, string> = {
  bronze: 'Bronze',
  silver: 'Prata',
  gold: 'Ouro',
  platinum: 'Platina',
}

export const TIER_ORDER: Tier[] = ['bronze', 'silver', 'gold', 'platinum']

export type Role = 'fan' | 'artist' | 'admin' | 'empresario'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  role: Role
  xp: number
  created_at: string
}

export interface EnterprisePlan {
  id: number
  name: string
  tagline: string
  price_cents: number
  benefits: string[]
  active: boolean
}

export type EnterpriseLeadStatus = 'pending_payment' | 'waitlist' | 'approved' | 'rejected'

export interface EnterpriseLead {
  id: string
  user_id: string
  artist_id: string | null
  company_name: string
  cnpj: string
  contact_name: string
  contact_email: string
  contact_phone: string
  segment: string | null
  budget_cents: number | null
  message: string | null
  status: EnterpriseLeadStatus
  paid: boolean
  paid_at: string | null
  reviewed_at: string | null
  review_note: string | null
  created_at: string
  artist?: Artist | null
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
  about: ArtistAbout
}

export interface ArtistAbout {
  history?: string
  influences?: string[]
  discography?: { title: string; year: string }[]
  awards?: string[]
}

export interface Video {
  id: string
  artist_id: string
  title: string
  category: 'clipe' | 'show' | 'entrevista' | 'bastidores'
  thumbnail_url: string | null
  duration: string | null
  views_count: number
  is_exclusive: boolean
  min_tier: Tier | null
  created_at: string
}

export const VIDEO_CATEGORY_LABELS: Record<Video['category'], string> = {
  clipe: 'Clipes',
  show: 'Shows',
  entrevista: 'Entrevistas',
  bastidores: 'Bastidores',
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
  status: 'active' | 'canceled' | 'pending' | 'past_due'
  started_at: string
  stripe_subscription_id?: string | null
  stripe_customer_id?: string | null
  current_period_end?: string | null
  cancel_at_period_end?: boolean
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

export interface Story {
  id: string
  artist_id: string
  media_url: string
  caption: string | null
  created_at: string
}

export type AdPlacement = 'home_hero' | 'home_inline' | 'discover' | 'events'

/** Espelha exatamente a tabela `public.ad_banners` do Supabase. */
export interface Ad {
  id: string
  title: string
  subtitle: string | null
  description: string | null
  image_url: string | null
  cta_label: string | null
  cta_url: string | null
  placement: AdPlacement
  accent_color: string | null
  is_active: boolean
  sort_order: number
  starts_at: string | null
  ends_at: string | null
  impressions: number
  clicks: number
  created_at: string
  updated_at: string | null
}

export const AD_PLACEMENT_LABELS: Record<AdPlacement, string> = {
  home_hero: 'Home — Destaque',
  home_inline: 'Home — Faixa',
  discover: 'Descobrir',
  events: 'Eventos',
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
