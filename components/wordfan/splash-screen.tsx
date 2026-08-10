'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface SplashScreenProps {
  logoUrl?: string | null
  siteName?: string
}

/**
 * Splash screen que aparece no primeiro carregamento/reload da página.
 * Some automaticamente após a janela disparar 'load' (todos os recursos
 * carregados) ou após 2s — o que vier primeiro.
 *
 * Usa sessionStorage para mostrar apenas uma vez por sessão (não repete
 * a cada navegação interna via router.push).
 */
export function SplashScreen({ logoUrl, siteName = 'WordFan' }: SplashScreenProps) {
  const [visible, setVisible] = useState(false)
  const [hiding, setHiding]   = useState(false)

  useEffect(() => {
    // Se já foi exibido nesta sessão (navegação via SPA), não mostra.
    try {
      if (sessionStorage.getItem('wf:splashed')) return
      sessionStorage.setItem('wf:splashed', '1')
    } catch { /* private mode — mostra sempre */ }

    setVisible(true)

    function dismiss() {
      setHiding(true)
      // aguarda a animação de saída terminar (600ms) antes de desmontar
      setTimeout(() => setVisible(false), 600)
    }

    // Dispara ao carregar todos os recursos, ou em 2s se demorar
    const MAX_WAIT = 2000
    const timer = setTimeout(dismiss, MAX_WAIT)

    function onLoad() {
      clearTimeout(timer)
      // pequeno delay para não desaparecer instantaneamente — mínimo 800ms visível
      const elapsed = performance.now()
      const remaining = Math.max(0, 800 - elapsed)
      setTimeout(dismiss, remaining)
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
    }

    return () => {
      clearTimeout(timer)
      window.removeEventListener('load', onLoad)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-label="Carregando…"
      aria-live="polite"
      className={[
        'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background',
        'transition-all duration-500 ease-in-out',
        hiding
          ? 'opacity-0 scale-110 pointer-events-none'
          : 'opacity-100 scale-100',
      ].join(' ')}
    >
      {/* Glow decorativo */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[80px]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={siteName}
            width={200}
            height={80}
            className="h-16 w-auto object-contain"
            priority
            unoptimized
          />
        ) : (
          <span
            className="font-serif text-5xl font-black tracking-tight select-none"
            aria-label={siteName}
          >
            <span className="text-foreground">Word</span>
            <span className="text-gradient-brand">Fan</span>
          </span>
        )}

        {/* Spinner animado */}
        <div className="relative flex items-center justify-center">
          {/* Anel externo — rotação lenta */}
          <span
            className="absolute size-14 animate-spin rounded-full border-2 border-transparent border-t-primary/60"
            style={{ animationDuration: '1.2s' }}
          />
          {/* Anel interno — rotação rápida inversa */}
          <span
            className="absolute size-8 animate-spin rounded-full border-2 border-transparent border-b-primary/30"
            style={{ animationDuration: '0.7s', animationDirection: 'reverse' }}
          />
          {/* Ponto central pulsante */}
          <span className="size-2 animate-pulse rounded-full bg-primary shadow-[0_0_12px_rgba(255,106,0,0.8)]" />
        </div>
      </div>
    </div>
  )
}
