'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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
    body: 'Bastidores, ensaios e conteúdos que só assinantes do fan club têm acesso.',
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
  {
    eyebrow: 'COMECE AGORA',
    titleTop: 'ENTRE PARA',
    titleAccent: 'O CLUBE',
    body: 'Crie sua conta grátis e descubra os fan clubs dos seus artistas favoritos.',
    image: '/content/hero-fans.png',
  },
]

export function OnboardingSlides() {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const isLast = index === SLIDES.length - 1

  function next() {
    if (isLast) {
      router.push('/auth/sign-up')
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-background">
      {/* Background blur orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-20 size-[300px] rounded-full bg-brand/10 blur-[100px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 size-[400px] rounded-full bg-brand/5 blur-[120px]"
      />

      {/* Slide */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-8 pt-20">
        <div className="flex flex-col items-center">
          <div className="w-full overflow-hidden rounded-[60px] border border-white/8">
            <Image
              src={slide.image || "/placeholder.svg"}
              alt=""
              width={620}
              height={620}
              priority
              className="aspect-square w-full object-cover"
            />
          </div>

          <p className="mt-16 text-center text-sm font-extrabold tracking-[0.3em] text-brand">
            {slide.eyebrow}
          </p>
          <h1 className="mt-4 text-center font-serif text-[44px] font-extrabold leading-[0.95] tracking-tight text-foreground">
            {slide.titleTop}
            <br />
            <span className="border-b-2 border-white/60 pb-1 text-brand">{slide.titleAccent}</span>
          </h1>
          <p className="mt-6 max-w-xs text-center text-lg leading-relaxed text-muted-foreground text-pretty">
            {slide.body}
          </p>
        </div>
      </div>

      {/* Footer controls */}
      <div className="relative z-10 flex items-center justify-between px-8 pb-12 pt-8">
        <Link
          href="/auth/login"
          className="text-sm font-extrabold tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          PULAR
        </Link>

        <div className="flex items-center gap-2" role="tablist" aria-label="Progresso do onboarding">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={
                i === index
                  ? 'h-2 w-8 rounded-full bg-brand transition-all'
                  : 'size-2 rounded-full bg-secondary transition-all'
              }
            />
          ))}
        </div>

        <button
          onClick={next}
          aria-label={isLast ? 'Criar conta' : 'Próximo slide'}
          className="flex size-14 items-center justify-center rounded-2xl bg-white text-black transition-transform hover:scale-105"
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
    </main>
  )
}
