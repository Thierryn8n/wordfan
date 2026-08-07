'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
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
      let dest = next
      // Sem destino específico: direciona pelo papel do usuário
      if (!searchParams.get('next')) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
          if (prof?.role === 'empresario') dest = '/manager'
          else if (prof?.role === 'admin') dest = '/admin'
          else if (prof?.role === 'artist') dest = '/dashboard'
        }
      }
      router.push(dest)
      router.refresh()
    } catch (err: unknown) {
      setError(loginErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo href="/" className="text-3xl" />
          <h1 className="mt-8 text-[28px] font-bold tracking-[-0.021em] text-balance">
            Bem-vindo de volta
          </h1>
          <p className="mt-1.5 text-[15px] text-[color:var(--label-secondary)]">
            Entre para acessar seus fan clubs
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8">
          <div className="ios-list">
            <div className="ios-row">
              <label htmlFor="email" className="w-20 shrink-0 text-[17px]">
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
                className="w-full bg-transparent text-[17px] outline-none placeholder:text-[color:var(--label-tertiary)]"
              />
            </div>
            <div className="ios-row">
              <label htmlFor="password" className="w-20 shrink-0 text-[17px]">
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
                className="w-full bg-transparent text-[17px] outline-none placeholder:text-[color:var(--label-tertiary)]"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 px-1 text-[13px] text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[17px] font-semibold text-primary-foreground transition-opacity active:opacity-70 disabled:opacity-50"
          >
            {isLoading ? 'Entrando…' : 'Entrar'}
            {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-6 text-center text-[15px] text-[color:var(--label-secondary)]">
          Ainda não tem conta?{' '}
          <Link
            href={next && next !== '/home' ? `/auth/sign-up?next=${encodeURIComponent(next)}` : '/auth/sign-up'}
            className="font-medium text-primary active:opacity-60"
          >
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  )
}
