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
  Copy,
  Check,
  ExternalLink,
  EyeOff,
  KeyRound,
  PencilLine,
  Send,
  Link2,
  UserCheck,
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

  // Formulário de criação (apenas email + senha)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Resultado da criação
  const [created, setCreated] = useState<{ slug: string; email: string; password: string; profileUrl: string } | null>(null)
  const [copied, setCopied] = useState<'link' | 'creds' | null>(null)

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
      const res = await createArtist({ email: newEmail, password: newPassword })
      if (res.error) {
        setError(res.error)
        return
      }
      setShowCreate(false)
      setCreated({ slug: res.slug!, email: res.email!, password: newPassword, profileUrl: res.profileUrl! })
      setNewEmail('')
      setNewPassword('')
      setShowPassword(false)
      router.refresh()
    })
  }

  async function copyText(text: string, which: 'link' | 'creds') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
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
        <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/8 bg-black/25 px-4 py-3.5">
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
          className="gradient-brand flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[10px] font-black tracking-[0.16em] text-white shadow-[0_12px_30px_-16px_rgba(255,106,0,.8)]"
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
              className="flex flex-col gap-4 rounded-2xl border border-white/[0.065] bg-white/[0.02] p-4 transition-colors hover:border-primary/15 hover:bg-primary/[0.025] sm:flex-row sm:items-center"
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

            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Informe apenas o <span className="font-bold text-foreground">email</span> e a{' '}
              <span className="font-bold text-foreground">senha</span> de acesso. O restante do perfil é
              preenchido na próxima etapa — por você ou pelo próprio artista.
            </p>

            <div className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">EMAIL DE ACESSO *</span>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="artista@email.com"
                  autoComplete="off"
                  className="rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">SENHA DE ACESSO *</span>
                <div className="flex items-stretch gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="flex shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/5 px-4 text-muted-foreground transition-colors hover:text-white"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </button>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground">
                  Você repassa email e senha ao artista. Ele pode alterá-los depois, no próprio painel.
                </span>
              </label>

              {error && (
                <p role="alert" className="text-xs font-bold text-destructive">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={isPending || !newEmail.trim() || newPassword.length < 8}
                className="gradient-brand mt-1 flex items-center justify-center gap-2 rounded-2xl py-4 text-[10px] font-black tracking-[0.25em] text-white disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                {isPending ? 'CRIANDO ACESSO...' : 'CRIAR ACESSO DO ARTISTA'}
              </button>
              <p className="text-center text-[9px] font-bold text-muted-foreground">
                Os 4 planos padrão do fan club serão criados automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: acesso criado — escolher preencher agora ou enviar link */}
      {created && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="created-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-6"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/8 bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15">
                <UserCheck className="size-5 text-emerald-400" aria-hidden="true" />
              </span>
              <h2 id="created-title" className="font-serif text-lg font-black">
                ACESSO CRIADO
              </h2>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              O acesso do artista está pronto. Agora escolha: preencher o perfil completo você mesmo, ou
              enviar o link e as credenciais para o artista preencher.
            </p>

            {/* Credenciais de acesso */}
            <div className="mt-4 rounded-2xl border border-white/8 bg-background p-4">
              <span className="flex items-center gap-2 text-[9px] font-black tracking-[0.2em] text-muted-foreground">
                <KeyRound className="size-3.5" aria-hidden="true" />
                CREDENCIAIS DE ACESSO
              </span>
              <dl className="mt-3 flex flex-col gap-1.5 text-xs font-bold">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="truncate">{created.email}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Senha</dt>
                  <dd className="font-numeric">{created.password}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() =>
                  copyText(`Email: ${created.email}\nSenha: ${created.password}\nAcesse: ${created.profileUrl}`, 'creds')
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/5 py-2.5 text-[9px] font-black tracking-[0.16em] transition-colors hover:bg-white/10"
              >
                {copied === 'creds' ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                {copied === 'creds' ? 'COPIADO' : 'COPIAR CREDENCIAIS'}
              </button>
            </div>

            {/* Link permanente criptografado */}
            <div className="mt-3">
              <span className="flex items-center gap-2 text-[9px] font-black tracking-[0.2em] text-muted-foreground">
                <Link2 className="size-3.5" aria-hidden="true" />
                LINK PERMANENTE DO PERFIL
              </span>
              <div className="mt-2 flex items-stretch gap-2">
                <input
                  readOnly
                  value={created.profileUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Link permanente do perfil do artista"
                  className="min-w-0 flex-1 rounded-2xl border border-white/8 bg-background px-3 py-3 text-xs font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyText(created.profileUrl, 'link')}
                  aria-label="Copiar link do perfil"
                  className="flex shrink-0 items-center justify-center rounded-2xl bg-primary/15 px-4 text-primary transition-colors hover:bg-primary/25"
                >
                  {copied === 'link' ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="mt-2 text-[9px] font-bold text-muted-foreground">
                Este link é criptografado e permanente. Depois de logado, o artista abre o próprio perfil por
                ele sempre que quiser.
              </p>
            </div>

            {/* Ações: preencher agora / enviar link */}
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  const slug = created.slug
                  setCreated(null)
                  router.push(`/dashboard/perfil?artist=${slug}`)
                }}
                className="gradient-brand flex items-center justify-center gap-2 rounded-2xl py-3.5 text-[10px] font-black tracking-[0.2em] text-white"
              >
                <PencilLine className="size-4" aria-hidden="true" />
                PREENCHER PERFIL AGORA
              </button>
              <button
                type="button"
                onClick={() =>
                  copyText(
                    `Seu acesso ao WordFan:\nEmail: ${created.email}\nSenha: ${created.password}\n\nEntre e preencha seu perfil por aqui: ${created.profileUrl}`,
                    'creds',
                  )
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/5 py-3.5 text-[10px] font-black tracking-[0.2em] transition-colors hover:bg-white/10"
              >
                <Send className="size-4" aria-hidden="true" />
                {copied === 'creds' ? 'MENSAGEM COPIADA' : 'ENVIAR LINK PARA O ARTISTA'}
              </button>
              <button
                type="button"
                onClick={() => setCreated(null)}
                className="text-center text-[10px] font-black tracking-[0.2em] text-muted-foreground transition-colors hover:text-white"
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
