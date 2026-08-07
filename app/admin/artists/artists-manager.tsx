'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Palette,
  Eye,
  Trash2,
  MapPin,
  Users,
  X,
  Loader2,
  AlertTriangle,
  Mail,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'
import type { Artist } from '@/lib/types'
import { resolveTheme } from '@/lib/artist-theme'
import { createArtist, deleteArtist } from './actions'

type ArtistRow = Artist & { subscribers: number; revenueCents: number }

const TOOL_LABELS: Record<string, string> = { basic: 'BÁSICO', pro: 'PRO', premium: 'PREMIUM' }

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function ArtistsManager({ artists }: { artists: ArtistRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ArtistRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Formulário de criação
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newGenre, setNewGenre] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newState, setNewState] = useState('')

  // Resultado do convite
  const [created, setCreated] = useState<{ slug: string; email: string; inviteLink: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return artists
    return artists.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.genre ?? '').toLowerCase().includes(q) ||
        (a.city ?? '').toLowerCase().includes(q),
    )
  }, [artists, query])

  function handleCreate() {
    setError(null)
    startTransition(async () => {
      const res = await createArtist({
        name: newName,
        email: newEmail,
        genre: newGenre,
        city: newCity,
        state: newState,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setShowCreate(false)
      setCreated({ slug: res.slug!, email: res.email!, inviteLink: res.inviteLink ?? null })
      setNewName('')
      setNewEmail('')
      setNewGenre('')
      setNewCity('')
      setNewState('')
      router.refresh()
    })
  }

  async function copyLink() {
    if (!created?.inviteLink) return
    try {
      await navigator.clipboard.writeText(created.inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar. Selecione e copie manualmente.')
    }
  }

  function handleDelete() {
    if (!confirmDelete) return
    setError(null)
    startTransition(async () => {
      const res = await deleteArtist({ artistId: confirmDelete.id })
      if (res.error) setError(res.error)
      setConfirmDelete(null)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Busca + criar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-3 rounded-2xl border border-white/8 bg-card px-4 py-3.5">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, gênero ou cidade..."
            aria-label="Buscar artistas"
            className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setShowCreate(true)
          }}
          className="gradient-brand flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[10px] font-black tracking-[0.2em] text-white"
        >
          <Plus className="size-4" aria-hidden="true" />
          NOVO ARTISTA
        </button>
      </div>

      <p className="mt-4 text-[10px] font-black tracking-[0.2em] text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? 'ARTISTA' : 'ARTISTAS'}
        {query && ' ENCONTRADOS'}
      </p>

      {error && !showCreate && !confirmDelete && (
        <p role="alert" className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-bold text-destructive">
          {error}
        </p>
      )}

      {/* Lista */}
      <ul className="mt-4 flex flex-col gap-3">
        {filtered.map((a) => {
          const t = resolveTheme(a.theme)
          return (
            <li
              key={a.id}
              className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-card p-4 sm:flex-row sm:items-center"
            >
              <Link href={`/admin/studio?artist=${a.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                <span className="relative shrink-0">
                  <Image
                    src={a.avatar_url || '/placeholder.svg?height=64&width=64'}
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 rounded-2xl border-2 object-cover"
                    style={{ borderColor: t.primary }}
                  />
                  <span
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[7px] font-black tracking-[0.1em] text-white"
                    style={{ backgroundColor: t.primary }}
                  >
                    {TOOL_LABELS[a.tool_plan]}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-serif text-base font-extrabold">{a.name}</span>
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundImage: `linear-gradient(135deg, ${t.gradient.from}, ${t.gradient.to})` }}
                      aria-label="Cor da identidade visual"
                    />
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-muted-foreground">
                    <span className="font-black tracking-[0.1em] uppercase" style={{ color: t.primary }}>
                      {a.genre || 'Sem gênero'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" aria-hidden="true" />
                      {a.city || '—'}{a.state ? `, ${a.state}` : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" aria-hidden="true" />
                      {a.subscribers} {a.subscribers === 1 ? 'assinante' : 'assinantes'}
                    </span>
                    <span className="font-numeric">{formatBRL(a.revenueCents)} • {a.commission_pct}% taxa</span>
                  </span>
                </span>
              </Link>

              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/studio?artist=${a.slug}`}
                  className="flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-gold transition-colors hover:bg-gold/25"
                >
                  <Palette className="size-3.5" aria-hidden="true" />
                  EDITAR
                </Link>
                <Link
                  href={`/artist/${a.slug}`}
                  className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] transition-colors hover:bg-secondary"
                >
                  <Eye className="size-3.5" aria-hidden="true" />
                  VER
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setConfirmDelete(a)
                  }}
                  aria-label={`Excluir ${a.name}`}
                  className="flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-destructive transition-colors hover:bg-destructive/20"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="rounded-3xl border border-white/8 bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum artista encontrado{query ? ` para "${query}"` : ''}.
          </li>
        )}
      </ul>

      {/* Modal: criar artista */}
      {showCreate && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/8 bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 id="create-title" className="font-serif text-lg font-black">
                NOVO ARTISTA
              </h2>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                aria-label="Fechar"
                className="flex size-9 items-center justify-center rounded-full border border-white/8"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">NOME ARTÍSTICO *</span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex.: Tati Girl"
                  className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">EMAIL DO ARTISTA *</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="artista@email.com"
                  autoComplete="off"
                  className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
                <span className="text-[9px] font-bold text-muted-foreground">
                  Enviaremos um convite para ele definir a própria senha e acessar o painel.
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">GÊNERO MUSICAL</span>
                <input
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  placeholder="Ex.: Pop, Sertanejo, Funk..."
                  className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
              </label>
              <div className="grid grid-cols-[1fr_88px] gap-3">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">CIDADE</span>
                  <input
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="Ex.: São Paulo"
                    className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">UF</span>
                  <input
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                    className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium uppercase outline-none focus:border-primary"
                  />
                </label>
              </div>

              {error && (
                <p role="alert" className="text-xs font-bold text-destructive">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || !newName.trim() || !newEmail.trim()}
                className="gradient-brand mt-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-[10px] font-black tracking-[0.25em] text-white disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                {isPending ? 'CRIANDO E CONVIDANDO...' : 'CRIAR E CONVIDAR ARTISTA'}
              </button>
              <p className="text-center text-[9px] font-bold text-muted-foreground">
                Os 4 planos padrão do fan club serão criados automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: convite criado */}
      {created && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/8 bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15">
                <Mail className="size-5 text-primary" aria-hidden="true" />
              </span>
              <h2 id="invite-title" className="font-serif text-lg font-black">
                ARTISTA CRIADO
              </h2>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Enviamos um convite para <span className="font-bold text-foreground">{created.email}</span>. O
              artista define a própria senha pelo link abaixo e passa a acessar o painel dele.
            </p>

            {created.inviteLink ? (
              <div className="mt-4">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">LINK DE CONVITE (VÁLIDO POR TEMPO LIMITADO)</span>
                <div className="mt-2 flex items-stretch gap-2">
                  <input
                    readOnly
                    value={created.inviteLink}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Link de convite"
                    className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-background px-3 py-3 text-xs font-medium outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    aria-label="Copiar link"
                    className="flex shrink-0 items-center justify-center rounded-2xl bg-primary/15 px-4 text-primary transition-colors hover:bg-primary/25"
                  >
                    {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                  </button>
                </div>
                <p className="mt-2 text-[9px] font-bold text-muted-foreground">
                  Repasse este link ao artista caso o email não chegue.
                </p>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl border border-white/8 bg-background px-4 py-3 text-xs font-bold text-muted-foreground">
                O convite foi enviado por email. Peça ao artista para verificar a caixa de entrada e o spam.
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  const slug = created.slug
                  setCreated(null)
                  router.push(`/admin/studio?artist=${slug}`)
                }}
                className="gradient-brand flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-[10px] font-black tracking-[0.2em] text-white"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                ABRIR NO STUDIO
              </button>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="rounded-2xl border border-white/8 bg-white/5 px-5 py-3.5 text-[10px] font-black tracking-[0.2em]"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: confirmar exclusão */}
      {confirmDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15">
                <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
              </span>
              <h2 id="delete-title" className="font-serif text-lg font-black">
                EXCLUIR {confirmDelete.name.toUpperCase()}?
              </h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Esta ação é permanente. Todos os planos, posts, shows, lives, vídeos, galeria, assinaturas e
              transações deste artista serão excluídos.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-2xl border border-white/8 bg-white/5 py-3.5 text-[10px] font-black tracking-[0.2em]"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 text-[10px] font-black tracking-[0.2em] text-white disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'EXCLUINDO...' : 'EXCLUIR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
