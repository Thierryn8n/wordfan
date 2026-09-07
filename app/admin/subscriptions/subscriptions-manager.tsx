'use client'

import { useMemo, useState, useTransition } from 'react'
import { Plus, Pencil, Trash2, X, Loader2, Search, Power } from 'lucide-react'
import type { Artist, Plan, Profile, Subscription } from '@/lib/types'
import { formatPrice, TIER_LABELS } from '@/lib/types'
import { saveSubscription, toggleSubscription, deleteSubscription } from './actions'

type Row = Subscription & { plan: Plan | null; artist: Artist | null }

const input =
  'w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 text-xs font-medium outline-none transition-colors placeholder:text-zinc-600 focus:border-gold/40'
const label = 'text-[9px] font-black tracking-[0.2em] text-muted-foreground'
const btnGold =
  'flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-[10px] font-black tracking-[0.2em] text-background transition-opacity hover:opacity-90 disabled:opacity-50'

export function SubscriptionsManager({
  subscriptions,
  users,
  plans,
  artists,
}: {
  subscriptions: Row[]
  users: Profile[]
  plans: Plan[]
  artists: Artist[]
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'canceled'>('all')
  const [form, setForm] = useState({ userId: '', planId: '', status: 'active' as 'active' | 'canceled' })

  const userName = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u.display_name || 'Sem nome'])),
    [users],
  )
  const artistName = useMemo(() => Object.fromEntries(artists.map((a) => [a.id, a.name])), [artists])

  const reset = () => {
    setEditing(null)
    setForm({ userId: '', planId: '', status: 'active' })
  }

  const run = (fn: () => Promise<{ error?: string; success?: boolean }>, okMsg: string) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await fn()
      if (res?.error) {
        setFeedback({ type: 'err', text: res.error })
        return
      }
      setFeedback({ type: 'ok', text: okMsg })
      reset()
    })
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return subscriptions.filter((s) => {
      const statusOk = statusFilter === 'all' || s.status === statusFilter
      const haystack = `${userName[s.user_id] ?? ''} ${s.artist?.name ?? artistName[s.artist_id] ?? ''}`.toLowerCase()
      return statusOk && (!q || haystack.includes(q))
    })
  }, [subscriptions, query, statusFilter, userName, artistName])

  const mrr = subscriptions
    .filter((s) => s.status === 'active')
    .reduce((acc, s) => acc + (s.plan?.price_cents ?? 0), 0)
  const activeCount = subscriptions.filter((s) => s.status === 'active').length

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

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'ASSINATURAS ATIVAS', value: activeCount.toLocaleString('pt-BR') },
          { label: 'RECEITA MENSAL (MRR)', value: formatPrice(mrr) },
          { label: 'TOTAL DE REGISTROS', value: subscriptions.length.toLocaleString('pt-BR') },
          { label: 'PLANOS DISPONÍVEIS', value: plans.length.toLocaleString('pt-BR') },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-white/8 bg-card p-5">
            <p className="font-numeric text-2xl font-bold">{s.value}</p>
            <p className="mt-1 text-[8px] font-black tracking-[0.2em] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600"
            aria-hidden="true"
          />
          <input
            className={`${input} pl-11`}
            placeholder="Buscar por fã ou artista"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar assinaturas"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'canceled'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={
                statusFilter === s
                  ? 'rounded-full bg-gold/15 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-gold'
                  : 'rounded-full border border-white/8 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              {s === 'all' ? 'TODAS' : s === 'active' ? 'ATIVAS' : 'CANCELADAS'}
            </button>
          ))}
        </div>
        {editing === null && (
          <button type="button" onClick={() => setEditing('new')} className={btnGold}>
            <Plus className="size-3.5" aria-hidden="true" />
            NOVA ASSINATURA
          </button>
        )}
      </div>

      {/* Formulário */}
      {editing !== null && (
        <form
          className="mt-5 grid gap-4 rounded-3xl border border-white/8 bg-card p-6 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault()
            run(
              () => saveSubscription({ id: editing === 'new' ? undefined : editing, ...form }),
              editing === 'new' ? 'Assinatura criada!' : 'Assinatura atualizada!',
            )
          }}
        >
          <div className="flex items-center justify-between md:col-span-3">
            <p className="text-[9px] font-black tracking-[0.2em] text-gold">
              {editing === 'new' ? 'NOVA ASSINATURA' : 'EDITAR ASSINATURA'}
            </p>
            <button type="button" onClick={reset} aria-label="Fechar formulário">
              <X className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>

          <div>
            <label className={label} htmlFor="s-user">FÃ *</label>
            <select
              id="s-user"
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

          <div>
            <label className={label} htmlFor="s-plan">PLANO *</label>
            <select
              id="s-plan"
              className={`mt-1.5 ${input}`}
              value={form.planId}
              onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
              required
            >
              <option value="">Selecione...</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {artistName[p.artist_id] ?? 'Artista'} · {p.name} · {formatPrice(p.price_cents)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={label}>SITUAÇÃO</p>
            <div className="mt-1.5 flex gap-2">
              {(['active', 'canceled'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={
                    form.status === s
                      ? 'rounded-full bg-gold/15 px-5 py-3 text-[9px] font-black tracking-[0.15em] text-gold'
                      : 'rounded-full border border-white/8 px-5 py-3 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                  }
                >
                  {s === 'active' ? 'ATIVA' : 'CANCELADA'}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <button type="submit" disabled={isPending} className={btnGold}>
              {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              {editing === 'new' ? 'CRIAR ASSINATURA' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      <ul className="mt-5 flex flex-col gap-2.5">
        {filtered.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/8 bg-card p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">
                {userName[s.user_id] ?? 'Fã'} → {s.artist?.name ?? artistName[s.artist_id] ?? 'Artista'}
              </p>
              <p className="mt-1 font-numeric text-[9px] font-bold text-zinc-500">
                {new Date(s.started_at)
                  .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                  .toUpperCase()}
                {s.plan ? ` · ${s.plan.name.toUpperCase()}` : ''}
              </p>
            </div>
            {s.plan && (
              <span className="shrink-0 rounded-full bg-club/10 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-club">
                {TIER_LABELS[s.plan.tier].toUpperCase()}
              </span>
            )}
            <p className="font-numeric text-sm font-bold">{formatPrice(s.plan?.price_cents ?? 0)}</p>
            <span
              className={
                s.status === 'active'
                  ? 'shrink-0 rounded-full bg-primary/15 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-primary'
                  : 'shrink-0 rounded-full bg-white/6 px-3 py-1.5 text-[8px] font-black tracking-[0.15em] text-muted-foreground'
              }
            >
              {s.status === 'active' ? 'ATIVA' : 'CANCELADA'}
            </span>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                aria-label={s.status === 'active' ? 'Cancelar assinatura' : 'Reativar assinatura'}
                disabled={isPending}
                className="flex size-9 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-gold"
                onClick={() =>
                  run(
                    () => toggleSubscription(s.id, s.status === 'active' ? 'canceled' : 'active'),
                    s.status === 'active' ? 'Assinatura cancelada.' : 'Assinatura reativada.',
                  )
                }
              >
                <Power className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Editar assinatura"
                className="flex size-9 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  setEditing(s.id)
                  setForm({
                    userId: s.user_id,
                    planId: s.plan_id,
                    status: s.status === 'active' ? 'active' : 'canceled',
                  })
                }}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Excluir assinatura"
                disabled={isPending}
                className="flex size-9 items-center justify-center rounded-full border border-destructive/20 text-destructive transition-colors hover:bg-destructive/10"
                onClick={() => {
                  if (confirm('Excluir esta assinatura e suas transações?')) {
                    run(() => deleteSubscription(s.id), 'Assinatura excluída.')
                  }
                }}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-xs font-bold text-muted-foreground">
            Nenhuma assinatura encontrada.
          </li>
        )}
      </ul>
    </div>
  )
}
