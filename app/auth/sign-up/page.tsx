'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/wordfan/logo'

function signUpErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (code === 'weak_password') {
    return 'Senha muito fraca. Use pelo menos 6 caracteres.'
  }
  if (code === 'email_address_invalid') {
    return 'Endereço de e-mail inválido. Use um e-mail real.'
  }
  if (code === 'over_request_rate_limit' || status === 429) {
    return 'Muitas tentativas. Aguarde um momento e tente de novo.'
  }
  if (code === 'user_already_exists') {
    return 'Não foi possível criar a conta com esses dados.'
  }
  return 'Algo deu errado. Tente novamente.'
}

export default function SignUpPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
            `${window.location.origin}/auth/callback`,
          data: { display_name: displayName },
        },
      })
      if (error) throw error
      router.push('/auth/sign-up-success')
    } catch (err: unknown) {
      setError(signUpErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const inputClass =
    'w-full bg-transparent text-[17px] outline-none placeholder:text-[color:var(--label-tertiary)]'
  const labelClass = 'w-20 shrink-0 text-[17px]'

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 py-10 pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo href="/" className="text-3xl" />
          <h1 className="mt-8 text-[28px] font-bold tracking-[-0.021em] text-balance">
            Crie sua conta
          </h1>
          <p className="mt-1.5 text-[15px] text-[color:var(--label-secondary)]">
            Entre para o clube dos verdadeiros fãs
          </p>
        </div>

        <form onSubmit={handleSignUp} className="mt-8">
          <div className="ios-list">
            <div className="ios-row">
              <label htmlFor="displayName" className={labelClass}>
                Nome
              </label>
              <input
                id="displayName"
                type="text"
                required
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Como quer ser chamado"
                className={inputClass}
              />
            </div>
            <div className="ios-row">
              <label htmlFor="email" className={labelClass}>
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
                className={inputClass}
              />
            </div>
            <div className="ios-row">
              <label htmlFor="password" className={labelClass}>
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={inputClass}
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
            {isLoading ? 'Criando conta…' : 'Criar conta'}
            {!isLoading && <ArrowRight className="size-4" aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-6 text-center text-[15px] text-[color:var(--label-secondary)]">
          Já tem conta?{' '}
          <Link href="/auth/login" className="font-medium text-primary active:opacity-60">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
