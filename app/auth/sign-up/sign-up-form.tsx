'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { signUpAction } from '@/app/auth/actions'
import { Logo } from '@/components/wordfan/logo'

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
    setIsLoading(true)
    setError(null)

    const formData = new FormData()
    formData.set('displayName', displayName)
    formData.set('email', email)
    formData.set('password', password)

    const result = await signUpAction(null, formData)
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
      return
    }
    router.push(result.dest ?? '/auth/sign-up-success')
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
