'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { loginAction } from '@/app/auth/actions'
import { Logo } from '@/components/wordfan/logo'

export function LoginForm({
  logoUrl,
  siteName = 'WordFan',
}: {
  logoUrl?: string | null
  siteName?: string
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/home'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    if (searchParams.get('next')) formData.set('next', next)

    const result = await loginAction(null, formData)
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }
    router.push(result.dest ?? '/home')
    router.refresh()
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6">
      {/* Decoração de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center">
          <Logo href="/" imageUrl={logoUrl ?? undefined} className="text-3xl" />
          <p className="mt-3 text-[9px] font-black tracking-[0.35em] text-muted-foreground">
            ÁREA DE ACESSO
          </p>
          <h1 className="mt-5 font-serif text-3xl font-black tracking-tight">BEM-VINDO
DE VOLTA</h1>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Entre para acessar seus fan clubs
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="mt-8 flex flex-col gap-5 rounded-[32px] border border-white/8 bg-card p-7"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
              E-MAIL
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="rounded-2xl border border-white/8 bg-background px-4 py-3.5 text-xs font-bold outline-none transition-colors placeholder:text-zinc-600 focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-[9px] font-black tracking-[0.2em] text-muted-foreground"
            >
              SENHA
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="rounded-2xl border border-white/8 bg-background px-4 py-3.5 text-xs font-bold outline-none transition-colors placeholder:text-zinc-600 focus:border-primary"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-bold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="gradient-brand mt-1 flex items-center justify-center gap-2 rounded-full py-4 text-[10px] font-black tracking-[0.25em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
            {!isLoading && <ArrowRight className="size-3.5" aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-bold text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link
            href={next && next !== '/home' ? `/auth/sign-up?next=${encodeURIComponent(next)}` : '/auth/sign-up'}
            className="font-black text-primary hover:underline"
          >
            CRIAR CONTA
          </Link>
        </p>
      </div>
    </main>
  )
}
