'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  X,
  Loader2,
  ImageIcon,
  ExternalLink,
  Database,
} from 'lucide-react'
import { AD_PLACEMENT_LABELS, type Ad, type AdPlacement } from '@/lib/types'
import { createAd, updateAd, deleteAd, toggleAd, type AdInput } from './actions'

const PLACEMENTS: AdPlacement[] = ['home_hero', 'home_feed', 'discover']

const EMPTY: AdInput = {
  title: '',
  subtitle: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  placement: 'home_feed',
  active: true,
  position: 0,
  starts_at: '',
  ends_at: '',
}

function toInput(ad: Ad): AdInput {
  return {
    title: ad.title,
    subtitle: ad.subtitle ?? '',
    image_url: ad.image_url ?? '',
    cta_label: ad.cta_label ?? '',
    cta_url: ad.cta_url ?? '',
    placement: ad.placement,
    active: ad.active,
    position: ad.position,
    starts_at: ad.starts_at ? ad.starts_at.slice(0, 16) : '',
    ends_at: ad.ends_at ? ad.ends_at.slice(0, 16) : '',
  }
}

export function AdsManager({
  initialAds,
  tableMissing,
}: {
  initialAds: Ad[]
  tableMissing: boolean
}) {
  const [ads] = useState<Ad[]>(initialAds)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Ad | null>(null)
  const [form, setForm] = useState<AdInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setError(null)
    setOpen(true)
  }

  function openEdit(ad: Ad) {
    setEditing(ad)
    setForm(toInput(ad))
    setError(null)
    setOpen(true)
  }

  function set<K extends keyof AdInput>(key: K, value: AdInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      const res = editing ? await updateAd(editing.id, form) : await createAd(form)
      if (res?.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      window.location.reload()
    })
  }

  function onToggle(ad: Ad) {
    startTransition(async () => {
      await toggleAd(ad.id, !ad.active)
      window.location.reload()
    })
  }

  function onDelete(ad: Ad) {
    if (!confirm(`Excluir o anúncio "${ad.title}"?`)) return
    startTransition(async () => {
      await deleteAd(ad.id)
      window.location.reload()
    })
  }

  return (
    <div className="mt-7">
      {tableMissing && (
        <div className="skeu-inset mb-5 flex items-start gap-3 rounded-2xl p-4">
          <Database className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
          <div className="text-xs leading-relaxed text-muted-foreground">
            <p className="font-black text-foreground">Tabela de anúncios ainda não existe.</p>
            <p className="mt-1">
              Rode o script{' '}
              <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] text-gold">
                scripts/001_create_ads.sql
              </code>{' '}
              no seu banco Supabase para ativar o CRUD. Depois recarregue esta página.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
          {ads.length} ANÚNCIO{ads.length === 1 ? '' : 'S'} CADASTRADO{ads.length === 1 ? '' : 'S'}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="skeu-btn sheen relative flex items-center gap-2 rounded-full px-5 py-2.5 text-[10px] font-black tracking-[0.15em] text-white"
        >
          <Plus className="size-4" aria-hidden="true" />
          NOVO ANÚNCIO
        </button>
      </div>

      {ads.length === 0 ? (
        <div className="glass-panel sheen relative mt-5 flex flex-col items-center gap-3 rounded-[28px] p-10 text-center">
          <span className="skeu-raised flex size-14 items-center justify-center rounded-2xl">
            <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
          <p className="text-xs font-bold text-muted-foreground">
            Nenhum anúncio ainda. Crie o primeiro para exibir na home.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 lg:grid-cols-2">
          {ads.map((ad) => (
            <li key={ad.id} className="skeu sheen relative overflow-hidden rounded-3xl p-4">
              <div className="flex gap-4">
                <div className="skeu-inset relative size-20 shrink-0 overflow-hidden rounded-2xl">
                  {ad.image_url ? (
                    <Image src={ad.image_url || '/placeholder.svg'} alt="" fill className="object-cover" />
                  ) : (
                    <span className="flex size-full items-center justify-center">
                      <ImageIcon className="size-5 text-zinc-600" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 shrink-0 rounded-full ${ad.active ? 'bg-emerald-400' : 'bg-zinc-600'}`}
                      aria-hidden="true"
                    />
                    <p className="truncate font-serif text-sm font-extrabold">{ad.title}</p>
                  </div>
                  {ad.subtitle && (
                    <p className="mt-1 line-clamp-2 text-[11px] font-medium text-muted-foreground">
                      {ad.subtitle}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="skeu-inset rounded-full px-2.5 py-1 text-[8px] font-black tracking-[0.1em] text-gold">
                      {AD_PLACEMENT_LABELS[ad.placement].toUpperCase()}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-500">POS. {ad.position}</span>
                    {ad.cta_url && (
                      <a
                        href={ad.cta_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-primary hover:underline"
                      >
                        <ExternalLink className="size-2.5" aria-hidden="true" />
                        LINK
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => onToggle(ad)}
                  disabled={pending}
                  className="skeu flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[9px] font-black tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {ad.active ? (
                    <>
                      <EyeOff className="size-3.5" aria-hidden="true" /> PAUSAR
                    </>
                  ) : (
                    <>
                      <Eye className="size-3.5" aria-hidden="true" /> ATIVAR
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(ad)}
                  className="skeu flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[9px] font-black tracking-[0.1em] transition-colors hover:text-primary"
                >
                  <Pencil className="size-3.5" aria-hidden="true" /> EDITAR
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(ad)}
                  disabled={pending}
                  className="skeu flex items-center justify-center rounded-xl px-3 py-2 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                  aria-label={`Excluir ${ad.title}`}
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal criar/editar */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm md:items-center md:p-6">
          <div className="glass-panel sheen relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[32px] p-6 md:rounded-[32px]">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-black">
                {editing ? 'Editar anúncio' : 'Novo anúncio'}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="skeu flex size-9 items-center justify-center rounded-full"
                aria-label="Fechar"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <Field label="Título">
                <input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={120}
                  className="skeu-inset w-full rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  placeholder="Ex.: Novo álbum já disponível"
                />
              </Field>

              <Field label="Subtítulo">
                <textarea
                  value={form.subtitle}
                  onChange={(e) => set('subtitle', e.target.value)}
                  maxLength={240}
                  rows={2}
                  className="skeu-inset w-full resize-none rounded-xl px-4 py-3 text-sm font-medium outline-none"
                  placeholder="Descrição curta do anúncio"
                />
              </Field>

              <Field label="URL da imagem">
                <input
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                  className="skeu-inset w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                  placeholder="https://..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Texto do botão">
                  <input
                    value={form.cta_label}
                    onChange={(e) => set('cta_label', e.target.value)}
                    maxLength={40}
                    className="skeu-inset w-full rounded-xl px-4 py-3 text-sm font-bold outline-none"
                    placeholder="Saiba mais"
                  />
                </Field>
                <Field label="Link do botão">
                  <input
                    value={form.cta_url}
                    onChange={(e) => set('cta_url', e.target.value)}
                    className="skeu-inset w-full rounded-xl px-4 py-3 text-sm font-medium outline-none"
                    placeholder="https:// ou /rota"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Posição (placement)">
                  <select
                    value={form.placement}
                    onChange={(e) => set('placement', e.target.value as AdPlacement)}
                    className="skeu-inset w-full rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  >
                    {PLACEMENTS.map((p) => (
                      <option key={p} value={p} className="bg-card">
                        {AD_PLACEMENT_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Ordem">
                  <input
                    type="number"
                    min={0}
                    value={form.position}
                    onChange={(e) => set('position', Number(e.target.value))}
                    className="skeu-inset w-full rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Início (opcional)">
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => set('starts_at', e.target.value)}
                    className="skeu-inset w-full rounded-xl px-3 py-3 text-xs font-bold outline-none"
                  />
                </Field>
                <Field label="Fim (opcional)">
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => set('ends_at', e.target.value)}
                    className="skeu-inset w-full rounded-xl px-3 py-3 text-xs font-bold outline-none"
                  />
                </Field>
              </div>

              <button
                type="button"
                onClick={() => set('active', !form.active)}
                className="skeu flex items-center justify-between rounded-xl px-4 py-3"
              >
                <span className="text-sm font-bold">Anúncio ativo</span>
                <span
                  className={`relative h-6 w-11 rounded-full transition-colors ${form.active ? 'bg-emerald-500/80' : 'bg-zinc-700'}`}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white transition-all ${form.active ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </span>
              </button>

              {error && <p className="text-xs font-bold text-destructive">{error}</p>}

              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="skeu-btn sheen relative flex h-13 items-center justify-center gap-2 rounded-2xl py-3.5 text-[11px] font-black tracking-[0.2em] text-white disabled:opacity-60"
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {editing ? 'SALVAR ALTERAÇÕES' : 'CRIAR ANÚNCIO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
        {label.toUpperCase()}
      </span>
      {children}
    </label>
  )
}
