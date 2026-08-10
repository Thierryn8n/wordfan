'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/wordfan/logo'

function signUpErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: string; status?: number }
  if (code === 'weak_password')             return 'Senha muito fraca. Use pelo menos 6 caracteres.'
  if (code === 'email_address_invalid')     return 'Endereço de e-mail inválido. Use um e-mail real.'
  if (code === 'over_request_rate_limit' || status === 429) return 'Muitas tentativas. Aguarde um momento e tente de novo.'
  if (code === 'user_already_exists')       return 'Não foi possível criar a conta com esses dados.'
  return 'Algo deu errado. Tente novamente.'
}

export function SignUpForm({
  logoUrl,
  siteName = 'WordFan',
}: {
  logoUrl?: string | null
  siteName?: string
}) {
  const [displayName, setDisplayName] = useState('')
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [isLoading,   setIsLoading]   = useState(false)
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
    'rounded-2xl border border-white/8 bg-background px-4 py-3.5 text-xs font-bold outline-none transition-colors placeholder:text-zinc-600 focus:border-primary'
  const labelClass = 'text-[9px] font-black tracking-[0.2em] text-muted-foreground'

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center">
          <Logo href="/" imageUrl={logoUrl ?? undefined} className="text-3xl" />
          <p className="mt-3 text-[9px] font-black tracking-[0.35em] text-muted-foreground">
            JUNTE-SE AO CLUBE
          </p>
          <h1 className="mt-5 font-serif text-3xl font-black tracking-tight">CRIE SUA CONTA</h1>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            Entre para o clube dos verdadeiros fãs
          </p>
        </div>

        <form
          onSubmit={handleSignUp}
          className="mt-8 flex flex-col gap-5 rounded-[32px] border border-white/8 bg-card p-7"
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="displayName" className={labelClass}>NOME</label>
            <input
              id="displayName" type="text" required autoComplete="name"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Como quer ser chamado" className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className={labelClass}>E-MAIL</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com" className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className={labelClass}>SENHA</label>
            <input
              id="password" type="password" required minLength={6} autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres" className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="text-xs font-bold text-destructive">{error}</p>
          )}

          <button
            type="submit" disabled={isLoading}
            className="gradient-brand mt-1 flex items-center justify-center gap-2 rounded-full py-4 text-[10px] font-black tracking-[0.25em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {isLoading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
            {!isLoading && <ArrowRight className="size-3.5" aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-bold text-muted-foreground">
          Já tem conta?{' '}
          <Link href="/auth/login" className="font-black text-primary hover:underline">
            ENTRAR
          </Link>
        </p>
      </div>
    </main>
  )
}
