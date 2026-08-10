'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav } from '@/components/wordfan/bottom-nav'

/**
 * Casca do app (estilo aplicativo nativo).
 *
 * O menu inferior fica FORA da árvore que é trocada a cada navegação: como este
 * componente vive em um `layout.tsx` compartilhado, o React mantém o <BottomNav />
 * montado enquanto apenas o conteúdo da página é substituído. Resultado: as micro
 * animações dos botões continuam visíveis durante a troca de tela.
 */

/** Rotas em tela cheia onde o dock atrapalharia (transmissão ao vivo). */
function isImmersive(pathname: string) {
  return pathname.endsWith('/live')
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const immersive = isImmersive(pathname)
  // /fanclub usa o laranja do sistema (brand); páginas de artista mantêm o tema do próprio artista (club).
  const accent = pathname.startsWith('/artist') ? 'club' : 'brand'

  return (
    <div className="relative mx-auto w-full max-w-md">
      <ScreenTransition pathname={pathname}>{children}</ScreenTransition>
      {!immersive && <BottomNav accent={accent} />}
    </div>
  )
}

/**
 * Anima a entrada de cada tela. A `key` derivada da rota força a nova tela a
 * reiniciar a animação, imitando o "push" de um navigation stack nativo.
 */
function ScreenTransition({ pathname, children }: { pathname: string; children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (reduced) return <div>{children}</div>

  return (
    <div key={pathname} className="screen-enter">
      {children}
    </div>
  )
}
