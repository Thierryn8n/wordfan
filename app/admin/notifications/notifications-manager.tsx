'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Search, Send, Eraser } from 'lucide-react'
import type { Artist, Notification, Profile } from '@/lib/types'
import {
  sendNotification,
  updateNotification,
  deleteNotification,
  purgeReadNotifications,
} from './actions'

type Audience = 'all' | 'role' | 'artist' | 'user'

const AUDIENCE_LABELS: Record<Audience, string> = {
  all: 'TODOS',
  role: 'POR PAPEL',
  artist: 'ASSINANTES DE UM ARTISTA',
  user: 'USUÁRIO ESPECÍFICO',
}

const input =
  'w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 text-xs font-medium outline-none transition-colors placeholder:text-zinc-600 focus:border-gold/40'
const label = 'text-[9px] font-black tracking-[0.2em] text-muted-foreground'
const btnGold =
  'flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-[10px] font-black tracking-[0.2em] text-background transition-opacity hover:opacity-90 disabled:opacity-50'

export function NotificationsManager({
  notifications,
  users,
  artists,
}: {
  notifications: Notification[]
  users: Profile[]
  artists: Artist[]
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'all' as Audience,
    role: 'fan' as 'fan' | 'artist' | 'admin',
    artistId: '',
    userId: '',
  })

  const userName = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.display_name || 'Sem nome'])),
    [users],
  )

  const reset = () => {
    setEditing(null)
    setForm({ title: '', body: '', audience: 'all', role: 'fan', artistId: '', userId: '' })
  }

  const run = (
    fn: () => Promise<{ error?: string; success?: boolean; sent?: number }>,
    okMsg: string,
  ) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) {
        setFeedback({ type: 'err', text: res.error })
        return
      }
      setFeedback({
        type: 'ok',
        text: res?.sent ? `${okMsg} (${res.sent} destinatários)` : okMsg,
      })
      reset()
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notifications
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.body ?? '').toLowerCase().includes(q) ||
        (userName[n.user_id] ?? '').toLowerCase().includes(q),
    )
  }, [notifications, query, userName])

  const unread = notifications.filter((n) => !n.read).length

  return (
    <div className="mt-7">
      {feedback && (
        <p
          role="status"
          className={
            feedback.type === 'ok'
              ? 'mb-4 rounded-2xl bg-primary/10 px-4 py-3 text-[11px] font-bold text-primary'
              : 'mb-4 rounded-2xl bg-destructive/10 px-4 py-3 text-[11px] font-bold text-destructive'
          }
        >
          {feedback.text}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { label: 'TOTAL ENVIADAS', value: notifications.length },
          { label: 'NÃO LIDAS', value: unread },
          { label: 'LIDAS', value: notifications.length - unread },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-white/8 bg-card p-5">
            <p className="font-numeric text-2xl font-bold">{s.value.toLocaleString('pt-BR')}</p>
            <p className="mt-1 text-[8px] font-black tracking-[0.2em] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600"
            aria-hidden="true"
          />
          <input
            className={`${input} pl-11`}
            placeholder="Buscar por título, texto ou destinatário"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar notificações"
          />
        </div>
        {editing === null && (
          <>
            <button type="button" onClick={() => setEditing('new')} className={btnGold}>
              <Plus className="size-3.5" aria-hidden="true" />
              NOVA NOTIFICAÇÃO
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (confirm('Excluir todas as notificações já lidas?')) {
                  run(purgeReadNotifications, 'Notificações lidas removidas.')
                }
              }}
              className="flex items-center gap-2 rounded-full border border-white/8 px-6 py-3 text-[10px] font-black tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Eraser className="size-3.5" aria-hidden="true" />
              LIMPAR LIDAS
            </button>
          </>
        )}
      </div>

      {editing !== null && (
        <form
          className="mt-5 grid gap-4 rounded-3xl border border-white/8 bg-card p-6 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (editing === 'new') {
              run(() => sendNotification(form), 'Notificação enviada!')
            } else {
              run(
                () => updateNotification({ id: editing, title: form.title, body: form.body }),
                'Notificação atualizada!',
              )
            }
          }}
        >
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-[9px] font-black tracking-[0.2em] text-gold">
              {editing === 'new' ? 'NOVA NOTIFICAÇÃO' : 'EDITAR NOTIFICAÇÃO'}
            </p>
            <button type="button" onClick={reset} aria-label="Fechar formulário">
              <X className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>

          <div className="md:col-span-2">
            <label className={label} htmlFor="n-title">TÍTULO *</label>
            <input
              id="n-title"
              className={`mt-1.5 ${input}`}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              maxLength={120}
              placeholder="Ex.: Nova live hoje às 21h"
            />
          </div>

          <div className="md:col-span-2">
            <label className={label} htmlFor="n-body">MENSAGEM</label>
            <textarea
              id="n-body"
              rows={3}
              className={`mt-1.5 ${input} resize-none`}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              maxLength={500}
            />
          </div>

          {editing === 'new' && (
            <>
              <div className="md:col-span-2">
                <p className={label}>PÚBLICO</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {(['all', 'role', 'artist', 'user'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, audience: a }))}
                      className={
                        form.audience === a
                          ? 'rounded-full bg-gold/15 px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-gold'
                          : 'rounded-full border border-white/8 px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                      }
                    >
                      {AUDIENCE_LABELS[a]}
                    </button>
                  ))}
                </div>
              </div>

              {form.audience === 'role' && (
                <div>
                  <label className={label} htmlFor="n-role">PAPEL</label>
                  <select
                    id="n-role"
                    className={`mt-1.5 ${input}`}
                    value={form.role}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, role: e.target.value as 'fan' | 'artist' | 'admin' }))
                    }
                  >
                    <option value="fan">Fãs</option>
                    <option value="artist">Artistas</option>
                    <option value="admin">Admins</option>
                  </select>
                </div>
              )}

              {form.audience === 'artist' && (
                <div>
                  <label className={label} htmlFor="n-artist">ARTISTA</label>
                  <select
                    id="n-artist"
                    className={`mt-1.5 ${input}`}
                    value={form.artistId}
                    onChange={(e) => setForm((f) => ({ ...f, artistId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione...</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.audience === 'user' && (
                <div>
                  <label className={label} htmlFor="n-user">USUÁRIO</label>
                  <select
                    id="n-user"
                    className={`mt-1.5 ${input}`}
                    value={form.userId}
                    onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                    required
                  >
                    <option value="">Selecione...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.display_name || u.id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          <div className="md:col-span-2">
            <button type="submit" disabled={isPending} className={btnGold}>
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="size-3.5" aria-hidden="true" />
              )}
              {editing === 'new' ? 'ENVIAR' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </form>
      )}

      <ul className="mt-5 flex flex-col gap-2.5">
        {filtered.map((n) => (
          <li key={n.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/8 bg-card p-4">
            <span
              className={n.read ? 'size-2 shrink-0 rounded-full bg-white/15' : 'size-2 shrink-0 rounded-full bg-gold'}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">{n.title}</p>
              {n.body && (
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{n.body}</p>
              )}
              <p className="mt-1 font-numeric text-[9px] font-bold text-zinc-500">
                {userName[n.user_id] ?? 'Usuário removido'} ·{' '}
                {new Date(n.created_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {n.read ? 'LIDA' : 'NÃO LIDA'}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label={`Editar ${n.title}`}
                className="flex size-9 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setEditing(n.id)
                  setForm((f) => ({ ...f, title: n.title, body: n.body ?? '' }))
                }}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`Excluir ${n.title}`}
                disabled={isPending}
                className="flex size-9 items-center justify-center rounded-full border border-destructive/20 text-destructive transition-colors hover:bg-destructive/10"
                onClick={() => run(() => deleteNotification(n.id), 'Notificação excluída.')}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-xs font-bold text-muted-foreground">
            Nenhuma notificação encontrada.
          </li>
        )}
      </ul>
    </div>
  )
}
