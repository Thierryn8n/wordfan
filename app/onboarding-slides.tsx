'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'

const ONBOARDING_KEY = 'wordfan:onboarded'
const SLIDE_MS = 5000

const SLIDES = [
  {
    eyebrow: 'BEM-VINDO À EXPERIÊNCIA',
    titleTop: 'O PALCO É',
    titleAccent: 'TODO SEU',
    body: 'A plataforma definitiva para fãs que querem estar mais próximos dos seus ídolos.',
    image: '/content/stage-confetti.png',
  },
  {
    eyebrow: 'CONTEÚDO EXCLUSIVO',
    titleTop: 'VEJA O QUE',
    titleAccent: 'NINGUÉM VÊ',
    body: 'Stories, bastidores, ensaios e vídeos que só o fan club tem acesso.',
    image: '/content/backstage.png',
  },
  {
    eyebrow: 'AO VIVO COM SEU ÍDOLO',
    titleTop: 'LIVES SEM',
    titleAccent: 'DISTÂNCIA',
    body: 'Participe de lives exclusivas com chat direto e interação em tempo real.',
    image: '/content/show-crowd.png',
  },
  {
    eyebrow: 'EXPERIÊNCIAS DE ELITE',
    titleTop: 'SEJA MAIS QUE',
    titleAccent: 'UM FÃ',
    body: 'Meet & greet, pré-venda de ingressos, sorteios e recompensas exclusivas.',
    image: '/content/studio-session.png',
  },
]

export function OnboardingSlides({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const startRef = useRef(0)
  const rafRef = useRef(0)
  const [progress, setProgress] = useState(0)

  // Onboarding aparece apenas uma vez por dispositivo.
  useEffect(() => {
    let seen = false
    try {
      seen = localStorage.getItem(ONBOARDING_KEY) === '1'
    } catch {
      seen = false
    }
    if (seen || isLoggedIn) {
      router.replace('/home')
      return
    }
    setReady(true)
  }, [isLoggedIn, router])

  const isLast = index === SLIDES.length - 1

  // Autoavanço com barra de progresso.
  useEffect(() => {
    if (!ready) return
    startRef.current = performance.now()
    setProgress(0)
    function tick(now: number) {
      const pct = Math.min(1, (now - startRef.current) / SLIDE_MS)
      setProgress(pct)
      if (pct >= 1) {
        setIndex((i) => (i + 1) % SLIDES.length)
      } else {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [index, ready])

  function finish(destination: string) {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1')
    } catch {
      /* ignore */
    }
    router.push(destination)
  }

  if (!ready) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Logo className="text-2xl opacity-40" />
      </main>
    )
  }

  const slide = SLIDES[index]

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-background">
      {/* Imagem de fundo full-bleed */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          key={slide.image}
          src={slide.image || '/placeholder.svg'}
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 448px"
          className="animate-[fadeIn_0.6s_ease] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-transparent" />
      </div>

      {/* Topo: logo + barras de progresso */}
      <div className="relative z-10 px-6 pt-8">
        <div className="flex items-center justify-between">
          <Logo className="text-2xl" />
          <button
            type="button"
            onClick={() => finish('/home')}
            className="text-[10px] font-black tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground"
          >
            PULAR
          </button>
        </div>
        <div className="mt-6 flex gap-1.5" role="tablist" aria-label="Progresso do onboarding">
          {SLIDES.map((s, i) => (
            <button
              key={s.image}
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
            >
              <span
                className="block h-full rounded-full bg-brand transition-[width]"
                style={{ width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%' }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 mt-auto flex flex-col px-7 pb-10">
        <p className="flex items-center gap-2 text-[11px] font-black tracking-[0.3em] text-brand">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {slide.eyebrow}
        </p>
        <h1 className="mt-4 font-serif text-[52px] font-black leading-[0.92] tracking-tight text-balance">
          {slide.titleTop}
          <br />
          <span className="text-gradient-brand">{slide.titleAccent}</span>
        </h1>
        <p className="mt-5 max-w-sm text-base leading-relaxed text-muted-foreground text-pretty">
          {slide.body}
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => finish('/home')}
            className="gradient-brand flex h-14 items-center justify-center gap-2 rounded-2xl text-[11px] font-black tracking-[0.25em] text-white transition-transform active:scale-[0.98]"
          >
            EXPLORAR ARTISTAS
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => finish('/auth/sign-up')}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/12 bg-card/60 text-[11px] font-black tracking-[0.2em] text-foreground backdrop-blur-sm transition-colors hover:bg-card"
          >
            CRIAR MINHA CONTA
          </button>
          <p className="mt-1 text-center text-[11px] font-bold text-muted-foreground">
            Já tem conta?{' '}
            <Link
              href="/auth/login"
              onClick={() => {
                try {
                  localStorage.setItem(ONBOARDING_KEY, '1')
                } catch {
                  /* ignore */
                }
              }}
              className="font-black text-brand hover:underline"
            >
              ENTRAR
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
