'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface SplashScreenProps {
  logoUrl?: string | null
  siteName?: string
}

/**
 * Splash screen com logo grande que aparece em todo reload/primeira carga.
 *
 * Estratégia:
 * - Inicia visível (visible: true) para cobrir o flash de conteúdo.
 * - Garante tempo MÍNIMO de 1.2s visível independente da velocidade de load.
 * - Some com animação de fade+scale após o load completo ou 2.5s (máx).
 * - sessionStorage evita repetição em navegações SPA (router.push).
 */
export function SplashScreen({ logoUrl, siteName = 'WordFan' }: SplashScreenProps) {
  // Começa true no cliente — o useEffect decide se vai esconder
  const [visible, setVisible]   = useState(true)
  const [hiding,  setHiding]    = useState(false)
  const mountTime               = useRef(Date.now())

  useEffect(() => {
    // Se já exibiu nesta sessão (navegação SPA), remove imediatamente
    try {
      if (sessionStorage.getItem('wf:splashed')) {
        setVisible(false)
        return
      }
      sessionStorage.setItem('wf:splashed', '1')
    } catch { /* private mode — mostra sempre */ }

    const MIN_VISIBLE_MS = 1200   // mínimo visível para o usuário ver a logo
    const MAX_VISIBLE_MS = 2800   // máximo — não trava a navegação

    function dismiss() {
      const elapsed  = Date.now() - mountTime.current
      const delay    = Math.max(0, MIN_VISIBLE_MS - elapsed)
      setTimeout(() => {
        setHiding(true)
        // aguarda animação de saída (500ms) antes de desmontar do DOM
        setTimeout(() => setVisible(false), 500)
      }, delay)
    }

    // Garante saída máxima
    const maxTimer = setTimeout(() => {
      setHiding(true)
      setTimeout(() => setVisible(false), 500)
    }, MAX_VISIBLE_MS)

    if (document.readyState === 'complete') {
      dismiss()
    } else {
      window.addEventListener('load', dismiss, { once: true })
    }

    return () => {
      clearTimeout(maxTimer)
      window.removeEventListener('load', dismiss)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-label="Carregando…"
      className={[
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background',
        hiding
          ? 'pointer-events-none opacity-0 scale-105'
          : 'opacity-100 scale-100',
        'transition-all duration-500 ease-in-out',
      ].join(' ')}
    >
      {/* Glow de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Conteúdo central */}
      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex items-center justify-center">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={siteName}
              width={220}
              height={90}
              className="h-16 w-auto object-contain drop-shadow-2xl sm:h-20"
              priority
              unoptimized
            />
          ) : (
            <span
              className="select-none font-serif font-bold tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)' }}
              aria-label={siteName}
            >
              <span className="text-foreground">Word</span>
              <span className="text-gradient-brand">Fan</span>
            </span>
          )}
        </div>

        {/* Rings + ponto animados */}
        <div className="relative flex items-center justify-center">
          {/* Anel externo */}
          <span
            className="absolute size-16 animate-spin rounded-full border-[2px] border-transparent border-t-primary/50"
            style={{ animationDuration: '1.4s' }}
          />
          {/* Anel médio — sentido inverso */}
          <span
            className="absolute size-10 animate-spin rounded-full border-[2px] border-transparent border-b-primary/30"
            style={{ animationDuration: '0.9s', animationDirection: 'reverse' }}
          />
          {/* Ponto pulsante */}
          <span className="size-2.5 animate-pulse rounded-full bg-primary shadow-[0_0_16px_4px_rgba(255,106,0,0.5)]" />
        </div>

      </div>
    </div>
  )
}
