'use client'

import { useMemo, useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Megaphone,
  Eye,
  EyeOff,
  ExternalLink,
  MousePointerClick,
  Upload,
  ImageIcon,
} from 'lucide-react'
import type { Ad, AdPlacement } from '@/lib/types'
import { AD_PLACEMENT_LABELS } from '@/lib/types'
import { AdBanner } from '@/components/wordfan/ad-banner'
import { saveAd, toggleAd, deleteAd, uploadAdImage } from '@/app/actions/ads'

const PLACEMENTS: AdPlacement[] = ['home_hero', 'home_inline', 'discover', 'events']

type FormState = {
  id?: string
  title: string
  subtitle: string
  description: string
  imageUrls: string[]
  ctaLabel: string
  ctaUrl: string
  placement: AdPlacement
  accentColor: string
  isActive: boolean
  sortOrder: number
  startsAt: string
  endsAt: string
}

const EMPTY: FormState = {
  title: '',
  subtitle: '',
  description: '',
  imageUrls: [],
  ctaLabel: '',
  ctaUrl: '',
  placement: 'home_inline',
  accentColor: '#ff6b00',
  isActive: true,
  sortOrder: 0,
  startsAt: '',
  endsAt: '',
}

function toFormState(ad: Ad): FormState {
  return {
    id: ad.id,
    title: ad.title,
    subtitle: ad.subtitle ?? '',
    description: ad.description ?? '',
    imageUrls: ad.image_url ? [ad.image_url] : [],
    ctaLabel: ad.cta_label ?? '',
    ctaUrl: ad.cta_url ?? '',
    placement: ad.placement,
    accentColor: ad.accent_color ?? '#ff6b00',
    isActive: ad.is_active,
    sortOrder: ad.sort_order,
    startsAt: ad.starts_at ? ad.starts_at.slice(0, 10) : '',
    endsAt: ad.ends_at ? ad.ends_at.slice(0, 10) : '',
  }
}

function previewAd(f: FormState): Ad {
  return {
    id: f.id ?? 'preview',
    title: f.title || 'Título do anúncio',
    subtitle: f.subtitle || null,
    description: f.description || null,
    image_url: f.imageUrls[0] || null,
    cta_label: f.ctaLabel || null,
    cta_url: f.ctaUrl || null,
    placement: f.placement,
    accent_color: f.accentColor || null,
    is_active: f.isActive,
    sort_order: f.sortOrder,
    starts_at: f.startsAt || null,
    ends_at: f.endsAt || null,
    impressions: 0,
    clicks: 0,
    created_at: new Date().toISOString(),
    updated_at: null,
  }
}

export function AdsManager({ ads, tableMissing }: { ads: Ad[]; tableMissing: boolean }) {
  const router = useRouter()
  const [form, setForm] = useState<FormState | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Ad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(file: File) {
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.set('file', file)
    const res = await uploadAdImage(fd)
    setUploading(false)
    if (res.error) {
      setError(res.error)
    } else if (res.url) {
      setForm((f) => f ? { ...f, imageUrls: [...f.imageUrls, res.url!] } : null)
    }
  }

  function removeImage(index: number) {
    setForm((f) => f ? { ...f, imageUrls: f.imageUrls.filter((_, i) => i !== index) } : null)
  }

  const grouped = useMemo(() => {
    const map = new Map<AdPlacement, Ad[]>()
    for (const p of PLACEMENTS) map.set(p, [])
    for (const ad of ads) map.get(ad.placement)?.push(ad)
    return map
  }, [ads])

  function openCreate() {
    setError(null)
    setForm({ ...EMPTY })
  }
  function openEdit(ad: Ad) {
    setError(null)
    setForm(toFormState(ad))
  }

  function handleSave() {
    if (!form) return
    setError(null)
    startTransition(async () => {
      const res = await saveAd({
        id: form.id,
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        imageUrl: form.imageUrls[0] || '',
        ctaLabel: form.ctaLabel,
        ctaUrl: form.ctaUrl,
        placement: form.placement,
        accentColor: form.accentColor,
        isActive: form.isActive,
        sortOrder: Number(form.sortOrder) || 0,
        startsAt: form.startsAt,
        endsAt: form.endsAt,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setForm(null)
      router.refresh()
    })
  }

  function handleToggle(ad: Ad) {
    startTransition(async () => {
      const res = await toggleAd(ad.id, !ad.is_active)
      if (res.error) setError(res.error)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirmDelete) return
    startTransition(async () => {
      const res = await deleteAd(confirmDelete.id)
      if (res.error) setError(res.error)
      setConfirmDelete(null)
      router.refresh()
    })
  }

  return (
    <div>
      {/* Cabeçalho da seção */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-brand">MONETIZAÇÃO</p>
          <h1 className="mt-1 font-serif text-3xl font-black tracking-tight">
            GERENCIAR ANÚNCIOS
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Crie, edite e publique anúncios exibidos na Home, Descobrir e Eventos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="gradient-brand elev-1 flex items-center gap-2 rounded-2xl px-5 py-3 text-[11px] font-black tracking-[0.15em] text-white transition-transform active:scale-95"
        >
          <Plus className="size-4" aria-hidden="true" />
          NOVO ANÚNCIO
        </button>
      </div>

      {tableMissing && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-extrabold text-amber-300">Tabela de anúncios indisponível</p>
            <p className="mt-1 text-xs text-amber-200/80">
              Não foi possível ler a tabela <code className="rounded bg-black/30 px-1">ad_banners</code>.
              Verifique as políticas de acesso no Supabase.
            </p>
          </div>
        </div>
      )}

      {error && !form && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300">
          <AlertTriangle className="size-4" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* Lista por posição */}
      <div className="mt-8 flex flex-col gap-10">
        {PLACEMENTS.map((placement) => {
          const items = grouped.get(placement) ?? []
          return (
            <section key={placement}>
              <div className="flex items-center gap-3">
                <h2 className="text-[11px] font-black tracking-[0.25em] text-muted-foreground">
                  {AD_PLACEMENT_LABELS[placement].toUpperCase()}
                </h2>
                <span className="hairline flex-1" aria-hidden="true" />
                <span className="font-numeric text-[11px] font-bold text-zinc-600">
                  {items.length}
                </span>
              </div>

              {items.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs font-bold text-zinc-600">
                  Nenhum anúncio nesta posição.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {items.map((ad) => (
                    <div
                      key={ad.id}
                      className="surface elev-1 flex items-center gap-4 rounded-2xl p-3"
                    >
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        {ad.image_url ? (
                          <Image
                            src={ad.image_url || '/placeholder.svg'}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-zinc-600">
                            <Megaphone className="size-5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-extrabold">{ad.title}</p>
                          <span
                            className={
                              ad.is_active
                                ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-[8px] font-black tracking-[0.15em] text-emerald-400'
                                : 'rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-black tracking-[0.15em] text-zinc-500'
                            }
                          >
                            {ad.is_active ? 'ATIVO' : 'INATIVO'}
                          </span>
                        </div>
                        {(ad.subtitle || ad.description) && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {ad.subtitle || ad.description}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {ad.cta_url && (
                            <span className="flex min-w-0 items-center gap-1 text-[10px] font-bold text-brand">
                              <ExternalLink className="size-2.5 shrink-0" aria-hidden="true" />
                              <span className="truncate">{ad.cta_url}</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-numeric text-[10px] font-bold text-zinc-500">
                            <Eye className="size-2.5" aria-hidden="true" />
                            {ad.impressions ?? 0}
                          </span>
                          <span className="flex items-center gap-1 font-numeric text-[10px] font-bold text-zinc-500">
                            <MousePointerClick className="size-2.5" aria-hidden="true" />
                            {ad.clicks ?? 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggle(ad)}
                          disabled={isPending}
                          aria-label={ad.is_active ? 'Desativar' : 'Ativar'}
                          className="surface flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          {ad.is_active ? (
                            <EyeOff className="size-4" aria-hidden="true" />
                          ) : (
                            <Eye className="size-4" aria-hidden="true" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(ad)}
                          aria-label="Editar"
                          className="surface flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(ad)}
                          aria-label="Excluir"
                          className="surface flex size-9 items-center justify-center rounded-xl text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Modal de criação/edição */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="elev-2 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-xl font-black tracking-tight">
                {form.id ? 'EDITAR ANÚNCIO' : 'NOVO ANÚNCIO'}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                aria-label="Fechar"
                className="surface flex size-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {/* Formulário */}
              <div className="flex flex-col gap-4">
                <Field label="Título *">
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="ad-input"
                    placeholder="Ex.: Turnê 2026 — Ingressos"
                  />
                </Field>
                <Field label="Subtítulo">
                  <input
                    value={form.subtitle}
                    onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    className="ad-input"
                    placeholder="Chamada curta exibida no card"
                  />
                </Field>
                <Field label="Descrição">
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={2}
                    className="ad-input resize-none"
                    placeholder="Texto de apoio (usado quando não há subtítulo)"
                  />
                </Field>
                <Field label="Imagens">
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] px-4 py-3 text-xs font-bold text-muted-foreground transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {uploading ? 'ENVIANDO...' : 'ENVIAR IMAGEM'}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleImageUpload(f)
                        e.target.value = ''
                      }}
                    />
                    {form.imageUrls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {form.imageUrls.map((url, index) => (
                          <div key={index} className="group relative aspect-video overflow-hidden rounded-lg border border-white/10">
                            <Image
                              src={url}
                              alt={`Imagem ${index + 1}`}
                              fill
                              className="object-cover"
                              sizes="100px"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-red-500/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Texto do botão">
                    <input
                      value={form.ctaLabel}
                      onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                      className="ad-input"
                      placeholder="COMPRAR"
                    />
                  </Field>
                  <Field label="Link do botão">
                    <input
                      value={form.ctaUrl}
                      onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                      className="ad-input"
                      placeholder="/artist/... ou https://..."
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Posição">
                    <select
                      value={form.placement}
                      onChange={(e) =>
                        setForm({ ...form, placement: e.target.value as AdPlacement })
                      }
                      className="ad-input"
                    >
                      {PLACEMENTS.map((p) => (
                        <option key={p} value={p}>
                          {AD_PLACEMENT_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Ordem">
                    <input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                      className="ad-input"
                    />
                  </Field>
                  <Field label="Cor de destaque">
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                      className="ad-input h-[42px] cursor-pointer p-1"
                      aria-label="Cor de destaque do anúncio"
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Início (opcional)">
                    <input
                      type="date"
                      value={form.startsAt}
                      onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                      className="ad-input"
                    />
                  </Field>
                  <Field label="Fim (opcional)">
                    <input
                      type="date"
                      value={form.endsAt}
                      onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                      className="ad-input"
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="size-4 accent-[var(--brand)]"
                  />
                  <span className="text-xs font-bold">Anúncio ativo (visível no app)</span>
                </label>
              </div>

              {/* Pré-visualização */}
              <div>
                <p className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
                  PRÉ-VISUALIZAÇÃO
                </p>
                <div className="mt-3 rounded-3xl border border-white/8 bg-background p-4">
                  <AdBanner
                    ad={previewAd(form)}
                    variant={form.placement === 'home_hero' ? 'hero' : 'inline'}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-300">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="surface rounded-2xl px-5 py-3 text-[11px] font-black tracking-[0.15em] text-muted-foreground"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="gradient-brand flex items-center gap-2 rounded-2xl px-6 py-3 text-[11px] font-black tracking-[0.15em] text-white disabled:opacity-60"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {form.id ? 'SALVAR ALTERAÇÕES' : 'CRIAR ANÚNCIO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="elev-2 w-full max-w-sm rounded-[24px] border border-white/10 bg-card p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-500/15 text-red-400">
              <Trash2 className="size-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-serif text-lg font-black">Excluir anúncio?</h3>
            <p className="mt-2 text-xs text-muted-foreground text-pretty">
              {'"'}
              {confirmDelete.title}
              {'"'} será removido permanentemente.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="surface flex-1 rounded-2xl px-4 py-3 text-[11px] font-black tracking-[0.15em] text-muted-foreground"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-[11px] font-black tracking-[0.15em] text-white disabled:opacity-60"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                EXCLUIR
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
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}
