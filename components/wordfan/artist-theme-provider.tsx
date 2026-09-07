import type { CSSProperties, ReactNode } from 'react'
import { resolveTheme, themeToCssVars, type ArtistTheme } from '@/lib/artist-theme'
import { cn } from '@/lib/utils'
import { NavThemePublisher } from '@/components/wordfan/nav-theme-publisher'

interface ArtistThemeScopeProps {
  theme: unknown
  children: ReactNode
  className?: string
}

/**
 * Aplica a identidade visual do artista via CSS custom properties.
 * Server-safe: apenas injeta style inline num contêiner.
 */
export function ArtistThemeScope({ theme, children, className }: ArtistThemeScopeProps) {
  const resolved: ArtistTheme = resolveTheme(theme)
  const vars = themeToCssVars(resolved) as CSSProperties

  return (
    <div style={vars} className={cn('artist-scope min-h-dvh', className)}>
      <NavThemePublisher theme={theme} />
      {children}
    </div>
  )
}
