'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { Plus, Pencil, Trash2, X, Loader2, Search, KeyRound, ShieldCheck, Mic2, User } from 'lucide-react'
import type { Profile } from '@/lib/types'
import { createUser, updateUser, deleteUser, resetUserPassword } from './actions'

type Role = 'fan' | 'artist' | 'admin'

const ROLE_META: Record<Role, { label: string; icon: typeof User; cls: string }> = {
  fan: { label: 'FÃ', icon: User, cls: 'bg-white/6 text-muted-foreground' },
  artist: { label: 'ARTISTA', icon: Mic2, cls: 'bg-primary/15 text-primary' },
  admin: { label: 'ADMIN', icon: ShieldCheck, cls: 'bg-gold/15 text-gold' },
}

const input =
  'w-full rounded-2xl border border-white/8 bg-background/60 px-4 py-3 text-xs font-medium outline-none transition-colors placeholder:text-zinc-600 focus:border-gold/40'
const label = 'text-[9px] font-black tracking-[0.2em] text-muted-foreground'
const btnGold =
  'flex items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 text-[10px] font-black tracking-[0.2em] text-background transition-opacity hover:opacity-90 disabled:opacity-50'

export function UsersManager({
  users,
  activeSubsByUser,
  canManageAuth,
}: {
  users: Profile[]
  activeSubsByUser: Record<string, number>
  canManageAuth: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [pwFor, setPwFor] = useState<string | null>(null)
  const [pw, setPw] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all')

  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    avatarUrl: '',
    role: 'fan' as Role,
    xp: 0,
  })

  const reset = () => {
    setEditing(null)
    setPwFor(null)
    setPw('')
    setForm({ email: '', password: '', displayName: '', avatarUrl: '', role: 'fan', xp: 0 })
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
    return users.filter((u) => {
      const roleOk = roleFilter === 'all' || u.role === roleFilter
      const queryOk = !q || (u.display_name ?? '').toLowerCase().includes(q) || u.id.includes(q)
      return roleOk && queryOk
    })
  }, [users, query, roleFilter])

  const counts = useMemo(
    () => ({
      all: users.length,
      fan: users.filter((u) => u.role === 'fan').length,
      artist: users.filter((u) => u.role === 'artist').length,
      admin: users.filter((u) => u.role === 'admin').length,
    }),
    [users],
  )

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

      {!canManageAuth && (
        <p className="mb-4 rounded-2xl border border-gold/20 bg-gold/5 px-4 py-3 text-[11px] font-bold text-gold">
          Criação de contas e troca de senha exigem a chave de service role do Supabase.
        </p>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-600"
            aria-hidden="true"
          />
          <input
            className={`${input} pl-11`}
            placeholder="Buscar por nome ou ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar usuários"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'fan', 'artist', 'admin'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={
                roleFilter === r
                  ? 'rounded-full bg-gold/15 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-gold'
                  : 'rounded-full border border-white/8 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground'
              }
            >
              {r === 'all' ? 'TODOS' : ROLE_META[r].label} ({counts[r]})
            </button>
          ))}
        </div>
        {editing === null && canManageAuth && (
          <button type="button" onClick={() => setEditing('new')} className={btnGold}>
            <Plus className="size-3.5" aria-hidden="true" />
            NOVO USUÁRIO
          </button>
        )}
      </div>

      {/* Formulário */}
      {editing !== null && (
        <form
          className="mt-5 grid gap-4 rounded-3xl border border-white/8 bg-card p-6 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (editing === 'new') {
              run(
                () =>
                  createUser({
                    email: form.email,
                    password: form.password,
                    displayName: form.displayName,
                    role: form.role,
                  }),
                'Usuário criado!',
              )
            } else {
              run(
                () =>
                  updateUser({
                    id: editing,
                    displayName: form.displayName,
                    avatarUrl: form.avatarUrl,
                    role: form.role,
                    xp: form.xp,
                  }),
                'Usuário atualizado!',
              )
            }
          }}
        >
          <div className="flex items-center justify-between md:col-span-2">
            <p className="text-[9px] font-black tracking-[0.2em] text-gold">
              {editing === 'new' ? 'NOVO USUÁRIO' : 'EDITAR USUÁRIO'}
            </p>
            <button type="button" onClick={reset} aria-label="Fechar formulário">
              <X className="size-4 text-muted-foreground" aria-hidden="true" />
            </button>
          </div>

          {editing === 'new' && (
            <>
              <div>
                <label className={label} htmlFor="u-email">E-MAIL *</label>
                <input
                  id="u-email"
                  type="email"
                  className={`mt-1.5 ${input}`}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className={label} htmlFor="u-pass">SENHA * (mín. 8)</label>
                <input
                  id="u-pass"
                  type="password"
                  className={`mt-1.5 ${input}`}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </div>
            </>
          )}

          <div>
            <label className={label} htmlFor="u-name">NOME DE EXIBIÇÃO *</label>
            <input
              id="u-name"
              className={`mt-1.5 ${input}`}
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              required
              maxLength={80}
            />
          </div>

          {editing !== 'new' && (
            <>
              <div>
                <label className={label} htmlFor="u-avatar">URL DO AVATAR</label>
                <input
                  id="u-avatar"
                  className={`mt-1.5 ${input}`}
                  value={form.avatarUrl}
                  onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className={label} htmlFor="u-xp">XP</label>
                <input
                  id="u-xp"
                  type="number"
                  min={0}
                  className={`mt-1.5 ${input}`}
                  value={form.xp}
                  onChange={(e) => setForm((f) => ({ ...f, xp: Number(e.target.value) }))}
                />
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <p className={label}>PAPEL</p>
            <div className="mt-1.5 flex gap-2">
              {(['fan', 'artist', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: r }))}
                  className={
                    form.role === r
                      ? 'rounded-full bg-gold/15 px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-gold'
                      : 'rounded-full border border-white/8 px-5 py-2.5 text-[9px] font-black tracking-[0.15em] text-muted-foreground'
                  }
                >
                  {ROLE_META[r].label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <button type="submit" disabled={isPending} className={btnGold}>
              {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
              {editing === 'new' ? 'CRIAR USUÁRIO' : 'SALVAR ALTERAÇÕES'}
            </button>
          </div>
        </form>
      )}

      {/* Troca de senha */}
      {pwFor && (
        <form
          className="mt-5 flex flex-wrap items-end gap-3 rounded-3xl border border-white/8 bg-card p-6"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => resetUserPassword(pwFor, pw), 'Senha redefinida!')
          }}
        >
          <div className="min-w-56 flex-1">
            <label className={label} htmlFor="u-newpass">NOVA SENHA (mín. 8)</label>
            <input
              id="u-newpass"
              type="password"
              className={`mt-1.5 ${input}`}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button type="submit" disabled={isPending} className={btnGold}>
            {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
            REDEFINIR
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-white/8 px-6 py-3 text-[10px] font-black tracking-[0.2em] text-muted-foreground"
          >
            CANCELAR
          </button>
        </form>
      )}

      {/* Lista */}
      <ul className="mt-5 flex flex-col gap-2.5">
        {filtered.map((u) => {
          const meta = ROLE_META[(u.role as Role) ?? 'fan'] ?? ROLE_META.fan
          const RoleIcon = meta.icon
          return (
            <li key={u.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/8 bg-card p-4">
              <Image
                src={u.avatar_url || '/placeholder.svg?height=44&width=44'}
                alt=""
                width={44}
                height={44}
                className="size-11 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-extrabold">
                  {u.display_name || 'Sem nome'}
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black tracking-[0.1em] ${meta.cls}`}
                  >
                    <RoleIcon className="size-2.5" aria-hidden="true" />
                    {meta.label}
                  </span>
                </p>
                <p className="mt-1 font-numeric text-[9px] font-bold text-zinc-500">
                  {u.xp?.toLocaleString('pt-BR') ?? 0} XP · {activeSubsByUser[u.id] ?? 0} ASSINATURAS ·{' '}
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-label={`Editar ${u.display_name ?? 'usuário'}`}
                  className="flex size-9 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setPwFor(null)
                    setEditing(u.id)
                    setForm({
                      email: '',
                      password: '',
                      displayName: u.display_name ?? '',
                      avatarUrl: u.avatar_url ?? '',
                      role: (u.role as Role) ?? 'fan',
                      xp: u.xp ?? 0,
                    })
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                {canManageAuth && (
                  <button
                    type="button"
                    aria-label={`Redefinir senha de ${u.display_name ?? 'usuário'}`}
                    className="flex size-9 items-center justify-center rounded-full border border-white/8 text-muted-foreground transition-colors hover:text-gold"
                    onClick={() => {
                      setEditing(null)
                      setPw('')
                      setPwFor(u.id)
                    }}
                  >
                    <KeyRound className="size-3.5" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Excluir ${u.display_name ?? 'usuário'}`}
                  disabled={isPending}
                  className="flex size-9 items-center justify-center rounded-full border border-destructive/20 text-destructive transition-colors hover:bg-destructive/10"
                  onClick={() => {
                    if (confirm('Excluir este usuário definitivamente?')) {
                      run(() => deleteUser(u.id), 'Usuário excluído.')
                    }
                  }}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-xs font-bold text-muted-foreground">
            Nenhum usuário encontrado.
          </li>
        )}
      </ul>
    </div>
  )
}
