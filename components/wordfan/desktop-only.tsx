'use client'

import { useEffect, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'

/** Largura mínima considerada "computador". */
const MIN_DESKTOP_WIDTH = 1024

export function DesktopBlocker() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-8 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="relative flex max-w-sm flex-col items-center">
        <Logo href="/" className="text-2xl" />
        <div className="mt-8 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl border border-white/8 bg-card text-muted-foreground">
            <Smartphone className="size-5" aria-hidden="true" />
          </span>
          <span className="h-px w-6 bg-white/10" aria-hidden="true" />
          <span className="gradient-brand flex size-12 items-center justify-center rounded-2xl text-white">
            <Monitor className="size-5" aria-hidden="true" />
          </span>
        </div>
        <h1 className="mt-7 font-serif text-2xl font-black tracking-tight text-balance">
          ACESSO SOMENTE POR COMPUTADOR
        </h1>
        <p className="mt-3 text-sm font-bold leading-relaxed text-muted-foreground text-pretty">
          Por segurança, o painel de gestão só pode ser acessado em um computador (desktop ou notebook).
          Abra este endereço em um navegador de computador para continuar.
        </p>
      </div>
    </main>
  )
}

/**
 * Guarda de cliente: só renderiza o conteúdo quando a janela tem largura de
 * computador. Complementa a detecção de user-agent feita no servidor.
 */
export function DesktopOnly({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'checking' | 'ok' | 'blocked'>('checking')

  useEffect(() => {
    const check = () => {
      setState(window.innerWidth >= MIN_DESKTOP_WIDTH ? 'ok' : 'blocked')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (state === 'checking') return null
  if (state === 'blocked') return <DesktopBlocker />
  return <>{children}</>
}
