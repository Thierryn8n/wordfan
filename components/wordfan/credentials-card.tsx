'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react'
import { updateArtistEmail, updateArtistPassword } from '@/app/dashboard/perfil/actions'

function Feedback({ state }: { state: { error?: string; ok?: string } }) {
  if (state.error)
    return (
      <p role="alert" className="mt-2 text-[10px] font-bold text-destructive">
        {state.error}
      </p>
    )
  if (state.ok)
    return (
      <p role="status" className="mt-2 text-[10px] font-bold text-emerald-400">
        {state.ok}
      </p>
    )
  return null
}

export function CredentialsCard({ currentEmail }: { currentEmail: string }) {
  const [email, setEmail] = useState(currentEmail)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [emailState, setEmailState] = useState<{ error?: string; ok?: string }>({})
  const [passState, setPassState] = useState<{ error?: string; ok?: string }>({})
  const [emailPending, startEmail] = useTransition()
  const [passPending, startPass] = useTransition()

  function saveEmail() {
    setEmailState({})
    startEmail(async () => {
      const fd = new FormData()
      fd.set('email', email)
      setEmailState(await updateArtistEmail(null, fd))
    })
  }

  function savePassword() {
    setPassState({})
    startPass(async () => {
      const fd = new FormData()
      fd.set('password', password)
      fd.set('confirm', confirm)
      const res = await updateArtistPassword(null, fd)
      setPassState(res)
      if (res.ok) {
        setPassword('')
        setConfirm('')
      }
    })
  }

  return (
    <section aria-labelledby="cred-h" className="admin-editor-section">
      <h2 id="cred-h" className="flex items-center gap-2 text-[11px] font-black tracking-[0.1em] text-muted-foreground">
        <KeyRound className="size-4" aria-hidden="true" />
        CREDENCIAIS DE ACESSO
      </h2>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-muted-foreground">
        Estes são o email e a senha que você usa para entrar. Você pode alterá-los quando quiser.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {/* Email */}
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.04em] text-zinc-400">
            <Mail className="size-3.5" aria-hidden="true" />
            EMAIL DE ACESSO
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={saveEmail}
            disabled={emailPending}
            className="h-10 rounded-xl border border-primary/30 bg-primary/10 text-[10px] font-black tracking-[0.08em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
          >
            {emailPending ? 'SALVANDO…' : 'ALTERAR EMAIL'}
          </button>
          <Feedback state={emailState} />
        </div>

        {/* Senha */}
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.04em] text-zinc-400">
            <KeyRound className="size-3.5" aria-hidden="true" />
            NOVA SENHA
          </span>
          <div className="flex items-stretch gap-2">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
              className="flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-card px-3 text-muted-foreground transition-colors hover:text-white"
            >
              {show ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            </button>
          </div>
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirme a senha"
            autoComplete="new-password"
            className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={savePassword}
            disabled={passPending}
            className="h-10 rounded-xl border border-primary/30 bg-primary/10 text-[10px] font-black tracking-[0.08em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
          >
            {passPending ? 'SALVANDO…' : 'ALTERAR SENHA'}
          </button>
          <Feedback state={passState} />
        </div>
      </div>
    </section>
  )
}
