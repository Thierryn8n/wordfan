export type ArtistThemeStyle = 'holographic' | 'neon' | 'gold' | 'clean'
export type ArtistFontDisplay = 'sora' | 'space-grotesk' | 'playfair' | 'bebas'
export type ArtistNavStyle = 'pill' | 'flat' | 'glass'
export type ToolPlan = 'basic' | 'pro' | 'premium'

export interface ArtistTheme {
  primary: string
  secondary: string
  bg: string
  surface: string
  text: string
  muted: string
  gradient: { from: string; via: string; to: string }
  style: ArtistThemeStyle
  font_display: ArtistFontDisplay
  radius: number
  nav_style: ArtistNavStyle
}

export const DEFAULT_THEME: ArtistTheme = {
  primary: '#FF6B00',
  secondary: '#FF8A00',
  bg: '#070707',
  surface: '#151515',
  text: '#FFFFFF',
  muted: '#A1A1AA',
  gradient: { from: '#FF8A00', via: '#FF6B00', to: '#FF4D00' },
  style: 'clean',
  font_display: 'sora',
  radius: 24,
  nav_style: 'glass',
}

const FONT_VARS: Record<ArtistFontDisplay, string> = {
  sora: 'var(--font-display)',
  'space-grotesk': 'var(--font-numeric)',
  playfair: 'var(--font-playfair)',
  bebas: 'var(--font-bebas)',
}

export const FONT_LABELS: Record<ArtistFontDisplay, string> = {
  sora: 'Sora',
  'space-grotesk': 'Space Grotesk',
  playfair: 'Playfair Display',
  bebas: 'Bebas Neue',
}

export const STYLE_LABELS: Record<ArtistThemeStyle, string> = {
  holographic: 'Holográfico',
  neon: 'Neon',
  gold: 'Ouro',
  clean: 'Clean',
}

export const NAV_LABELS: Record<ArtistNavStyle, string> = {
  pill: 'Pílula',
  flat: 'Reto',
  glass: 'Vidro',
}

export function resolveTheme(raw: unknown): ArtistTheme {
  const t = (raw ?? {}) as Partial<ArtistTheme>
  return {
    ...DEFAULT_THEME,
    ...t,
    gradient: { ...DEFAULT_THEME.gradient, ...(t.gradient ?? {}) },
  }
}

export function themeToCssVars(theme: ArtistTheme): Record<string, string> {
  return {
    '--artist-primary': theme.primary,
    '--artist-secondary': theme.secondary,
    '--artist-bg': theme.bg,
    '--artist-surface': theme.surface,
    '--artist-text': theme.text,
    '--artist-muted': theme.muted,
    '--artist-grad-from': theme.gradient.from,
    '--artist-grad-via': theme.gradient.via,
    '--artist-grad-to': theme.gradient.to,
    '--artist-radius': `${theme.radius}px`,
    '--artist-font': FONT_VARS[theme.font_display] ?? FONT_VARS.sora,
  }
}

/* Tool plan entitlements */
export const TOOL_PLANS: Record<
  ToolPlan,
  { label: string; price: string; features: string[] }
> = {
  basic: {
    label: 'Básico',
    price: 'R$ 99/mês',
    features: ['Perfil público', 'Agenda de shows'],
  },
  pro: {
    label: 'Pro',
    price: 'R$ 249/mês',
    features: ['Perfil público', 'Agenda de shows', 'Fan club e posts exclusivos', 'Galeria'],
  },
  premium: {
    label: 'Premium',
    price: 'R$ 499/mês',
    features: [
      'Perfil público',
      'Agenda de shows',
      'Fan club e posts exclusivos',
      'Galeria',
      'Lives exclusivas',
      'Ranking de fãs',
    ],
  },
}

export type Entitlement = 'profile' | 'agenda' | 'club' | 'gallery' | 'lives' | 'ranking'

const ENTITLEMENTS: Record<ToolPlan, Entitlement[]> = {
  basic: ['profile', 'agenda'],
  pro: ['profile', 'agenda', 'club', 'gallery'],
  premium: ['profile', 'agenda', 'club', 'gallery', 'lives', 'ranking'],
}

export function hasEntitlement(plan: string | null | undefined, feature: Entitlement): boolean {
  const p = (plan ?? 'basic') as ToolPlan
  return (ENTITLEMENTS[p] ?? ENTITLEMENTS.basic).includes(feature)
}
