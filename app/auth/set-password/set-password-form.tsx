'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Loader2 } from 'lucide-react'
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
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo href="/" className="text-3xl" />
          <h1 className="mt-8 text-[28px] font-bold tracking-[-0.021em] text-balance">
            Crie sua senha
          </h1>
          <p className="mt-1.5 text-[15px] text-[color:var(--label-secondary)]">
            {email ? `Conta ${email}` : 'Defina uma senha para acessar seu painel'}
          </p>
        </div>

        {checking ? (
          <div className="ios-card mt-8 flex items-center justify-center p-10">
            <Loader2 className="size-5 animate-spin text-[color:var(--label-secondary)]" aria-hidden="true" />
          </div>
        ) : !hasSession ? (
          <div className="ios-card mt-8 p-6 text-center">
            <p className="text-[15px] leading-relaxed text-[color:var(--label-secondary)]">
              Este link precisa ser aberto a partir do convite enviado por email. Se ele expirou, peça ao
              administrador um novo convite.
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[color:var(--ios-fill)] px-6 py-3 text-[17px] font-medium active:opacity-70"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="ios-list">
              <div className="ios-row">
                <label htmlFor="password" className="w-28 shrink-0 text-[17px]">
                  Nova senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-transparent text-[17px] outline-none placeholder:text-[color:var(--label-tertiary)]"
                />
              </div>
              <div className="ios-row">
                <label htmlFor="confirm" className="w-28 shrink-0 text-[17px]">
                  Confirmar
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a senha"
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
              disabled={isSaving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-[17px] font-semibold text-primary-foreground transition-opacity active:opacity-70 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
              {isSaving ? 'Salvando…' : 'Definir senha e entrar'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
