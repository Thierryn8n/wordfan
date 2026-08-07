'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/wordfan/logo'

export function SetPasswordForm() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setHasSession(true)
        setEmail(data.user.email ?? null)
      }
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password,
        data: { must_set_password: false },
      })
      if (error) throw error
      // Direciona para o painel certo conforme o papel
      const {
        data: { user },
      } = await supabase.auth.getUser()
      let dest = '/dashboard'
      if (user) {
        const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        if (prof?.role === 'empresario') dest = '/manager'
        else if (prof?.role === 'admin') dest = '/admin'
      }
      router.push(dest)
      router.refresh()
    } catch {
      setError('Não foi possível salvar a senha. O link pode ter expirado — peça um novo convite.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center">
          <Logo href="/" className="text-3xl" />
          <p className="mt-3 text-[9px] font-black tracking-[0.35em] text-muted-foreground">
            ACESSO DO ARTISTA
          </p>
          <h1 className="mt-5 font-serif text-3xl font-black tracking-tight text-balance">
            CRIE SUA SENHA
          </h1>
          <p className="mt-2 text-xs font-bold text-muted-foreground">
            {email ? `Conta ${email}` : 'Defina uma senha para acessar seu painel'}
          </p>
        </div>

        {checking ? (
          <div className="mt-8 flex items-center justify-center rounded-[32px] border border-white/8 bg-card p-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : !hasSession ? (
          <div className="mt-8 rounded-[32px] border border-white/8 bg-card p-7 text-center">
            <p className="text-sm font-bold leading-relaxed text-muted-foreground">
              Este link precisa ser aberto a partir do convite enviado por email. Se ele expirou, peça ao
              administrador um novo convite.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-white/8 bg-white/5 px-6 py-3.5 text-[10px] font-black tracking-[0.2em]"
            >
              IR PARA O LOGIN
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-5 rounded-[32px] border border-white/8 bg-card p-7"
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
                NOVA SENHA
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="rounded-2xl border border-white/8 bg-background px-4 py-3.5 text-xs font-bold outline-none transition-colors placeholder:text-zinc-600 focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="confirm" className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
                CONFIRMAR SENHA
              </label>
              <input
                id="confirm"
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a senha"
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
              disabled={isSaving}
              className="gradient-brand mt-1 flex items-center justify-center gap-2 rounded-full py-4 text-[10px] font-black tracking-[0.25em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-3.5" aria-hidden="true" />}
              {isSaving ? 'SALVANDO...' : 'DEFINIR SENHA E ENTRAR'}
              {!isSaving && <ArrowRight className="size-3.5" aria-hidden="true" />}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
