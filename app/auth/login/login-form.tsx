'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/wordfan/logo'

function loginErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (code === 'email_not_confirmed') {
    return 'Confirme seu e-mail antes de entrar — verifique sua caixa de entrada.'
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Muitas tentativas. Aguarde um momento e tente de novo.'
  }
  if (code === 'invalid_credentials') {
    return 'E-mail ou senha inválidos.'
  }
  return 'Algo deu errado. Tente novamente.'
}

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/home'

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      setError(loginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <Logo href="/" className="text-3xl" />
          <h1 className="mt-6 font-serif text-2xl font-bold">Bem-vindo de volta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre para acessar seus fan clubs</p>
        </div>

        <form onSubmit={handleLogin} className="glass mt-8 flex flex-col gap-4 rounded-2xl p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="rounded-xl border border-input bg-secondary/50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              className="rounded-xl border border-input bg-secondary/50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="gradient-brand mt-2 rounded-full py-3 font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
