'use client'

import { useState, useTransition } from 'react'
import { Briefcase, Plus, Mail, Copy, Check, Trash2, Loader2, X } from 'lucide-react'
import { inviteManager, removeManager } from './manager-actions'

export type ManagerRow = { userId: string; email: string; name: string }

export function ManagerSection({
  artistId,
  artistName,
  managers,
}: {
  artistId: string
  artistName: string
  managers: ManagerRow[]
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [created, setCreated] = useState<{ email: string; inviteLink: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = await inviteManager({ artistId, email, name })
      if (res.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      setName('')
      setEmail('')
      setCreated({ email: res.email!, inviteLink: res.inviteLink ?? null })
    })
  }

  function remove(userId: string) {
    if (typeof window !== 'undefined' && !window.confirm('Remover o acesso deste empresário?')) return
    startTransition(async () => {
      await removeManager({ artistId, userId })
    })
  }

  async function copyLink() {
    if (!created?.inviteLink) return
    try {
      await navigator.clipboard.writeText(created.inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <section aria-labelledby="managers-h" className="mt-10 rounded-[32px] border border-white/8 bg-card p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/15">
            <Briefcase className="size-5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h2 id="managers-h" className="font-serif text-lg font-black tracking-tight">
              EMPRESÁRIO DO ARTISTA
            </h2>
            <p className="text-[10px] font-bold text-muted-foreground">
              Dono do artista: acesso total ao painel e conteúdo de {artistName}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(true)
            setError(null)
          }}
          className="gradient-brand flex items-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black tracking-[0.2em] text-white"
        >
          <Plus className="size-4" aria-hidden="true" />
          ADICIONAR EMPRESÁRIO
        </button>
      </div>

      {/* Lista */}
      <ul className="mt-6 flex flex-col gap-2">
        {managers.length === 0 && (
          <li className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[11px] font-bold text-muted-foreground">
            Nenhum empresário vinculado ainda.
          </li>
        )}
        {managers.map((m) => (
          <li
            key={m.userId}
            className="flex items-center gap-4 rounded-2xl border border-white/8 bg-background p-4"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 font-black text-primary">
              {m.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold">{m.name}</p>
              <p className="truncate text-[11px] font-bold text-muted-foreground">{m.email}</p>
            </div>
            <button
              type="button"
              onClick={() => remove(m.userId)}
              disabled={isPending}
              aria-label={`Remover ${m.name}`}
              className="flex size-9 items-center justify-center rounded-xl border border-white/8 text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      {/* Modal de convite */}
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="invite-mgr-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/8 bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 id="invite-mgr-title" className="font-serif text-lg font-black">
                NOVO EMPRESÁRIO
              </h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="flex size-9 items-center justify-center rounded-xl border border-white/8">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-5 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">NOME DO EMPRESÁRIO *</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex.: João Mendes"
                  className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">EMAIL *</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="empresario@email.com"
                  autoComplete="off"
                  className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
                <span className="text-[9px] font-bold text-muted-foreground">
                  Ele recebe um convite para definir a senha e acessar o painel do empresário.
                </span>
              </label>
              {error && (
                <p role="alert" className="text-center text-xs font-bold text-destructive">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={isPending || !name.trim() || !email.trim()}
                className="gradient-brand mt-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-[10px] font-black tracking-[0.25em] text-white disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                {isPending ? 'CONVIDANDO...' : 'CONVIDAR EMPRESÁRIO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado do convite */}
      {created && (
        <div role="dialog" aria-modal="true" aria-labelledby="mgr-created-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/8 bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                <Mail className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h3 id="mgr-created-title" className="font-serif text-lg font-black">
                EMPRESÁRIO CONVIDADO
              </h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Convite enviado para <span className="font-bold text-foreground">{created.email}</span>. Ele
              define a senha pelo link abaixo e passa a gerenciar {artistName}.
            </p>
            {created.inviteLink ? (
              <div className="mt-4">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">LINK DE CONVITE</span>
                <div className="mt-2 flex items-stretch gap-2">
                  <input
                    readOnly
                    value={created.inviteLink}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Link de convite"
                    className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-background px-3 py-3 text-xs font-medium outline-none"
                  />
                  <button type="button" onClick={copyLink} aria-label="Copiar link" className="flex shrink-0 items-center justify-center rounded-2xl bg-primary/15 px-4 text-primary hover:bg-primary/25">
                    {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-white/8 bg-background px-4 py-3 text-xs font-bold text-muted-foreground">
                Convite enviado por email. Peça para verificar a caixa de entrada e o spam.
              </p>
            )}
            <button
              type="button"
              onClick={() => setCreated(null)}
              className="gradient-brand mt-6 w-full rounded-2xl py-3.5 text-[10px] font-black tracking-[0.2em] text-white"
            >
              CONCLUIR
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
