'use client'

import { useEffect } from 'react'
import { resolveTheme } from '@/lib/artist-theme'

/**
 * Publica a paleta do artista em `:root` para que a navegação inferior
 * (BottomNav) — que vive no layout compartilhado, FORA do `.artist-scope` —
 * possa usar as cores do artista. CSS custom properties só herdam para
 * descendentes; o dock é `fixed` e fica em outra subárvore, então a ponte
 * precisa ser feita no elemento raiz.
 *
 * Ao desmontar (sair da página do artista), as variáveis são removidas e o
 * dock volta ao laranja da marca.
 */
export function NavThemePublisher({ theme }: { theme: unknown }) {
  useEffect(() => {
    const t = resolveTheme(theme)
    const root = document.documentElement
    const vars: Array<[string, string]> = [
      ['--nav-accent', t.primary],
      ['--nav-accent-2', t.secondary],
      ['--nav-grad-from', t.gradient.from],
      ['--nav-grad-via', t.gradient.via],
      ['--nav-grad-to', t.gradient.to],
    ]
    for (const [k, v] of vars) root.style.setProperty(k, v)
    return () => {
      for (const [k] of vars) root.style.removeProperty(k)
    }
  }, [theme])

  return null
}
