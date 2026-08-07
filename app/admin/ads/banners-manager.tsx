'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  AlertTriangle,
  Eye,
  MousePointerClick,
  ImageIcon,
  Power,
  Megaphone,
} from 'lucide-react'
import type { AdBanner, AdPlacement } from '@/lib/types'
import { AD_PLACEMENT_LABELS } from '@/lib/types'
import { createBanner, updateBanner, deleteBanner, toggleBanner, type BannerInput } from './actions'

const PLACEMENTS: AdPlacement[] = ['home_hero', 'home_inline', 'home_footer']

const EMPTY: BannerInput = {
  title: '',
  subtitle: '',
  description: '',
  image_url: '',
  cta_label: '',
  cta_url: '',
  placement: 'home_hero',
  accent_color: '#ff6b00',
  is_active: true,
  sort_order: 0,
  starts_at: '',
  ends_at: '',
}

function toInput(b: AdBanner): BannerInput {
  return {
    title: b.title,
    subtitle: b.subtitle ?? '',
    description: b.description ?? '',
    image_url: b.image_url ?? '',
    cta_label: b.cta_label ?? '',
    cta_url: b.cta_url ?? '',
    placement: b.placement,
    accent_color: b.accent_color ?? '#ff6b00',
    is_active: b.is_active,
    sort_order: b.sort_order,
    starts_at: b.starts_at ? b.starts_at.slice(0, 16) : '',
    ends_at: b.ends_at ? b.ends_at.slice(0, 16) : '',
  }
}

function ctr(b: AdBanner) {
  if (!b.impressions) return '0%'
  return `${((b.clicks / b.impressions) * 100).toFixed(1)}%`
}

export function BannersManager({ banners }: { banners: AdBanner[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<AdBanner | 'new' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AdBanner | null>(null)
  const [form, setForm] = useState<BannerInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const grouped = useMemo(() => {
    return PLACEMENTS.map((p) => ({
      placement: p,
      items: banners.filter((b) => b.placement === p),
    }))
  }, [banners])

  const totals = useMemo(() => {
    const active = banners.filter((b) => b.is_active).length
    const impressions = banners.reduce((a, b) => a + b.impressions, 0)
    const clicks = banners.reduce((a, b) => a + b.clicks, 0)
    return { total: banners.length, active, impressions, clicks }
  }, [banners])

  function openNew() {
    setError(null)
    setForm(EMPTY)
    setEditing('new')
  }

  function openEdit(b: AdBanner) {
    setError(null)
    setForm(toInput(b))
    setEditing(b)
  }

  function set<K extends keyof BannerInput>(key: K, value: BannerInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res =
        editing === 'new'
          ? await createBanner(form)
          : editing
            ? await updateBanner(editing.id, form)
            : { error: 'Estado inválido.' }
      if (res?.error) {
        setError(res.error)
        return
      }
      setEditing(null)
      router.refresh()
    })
  }

  function handleToggle(b: AdBanner) {
    startTransition(async () => {
      await toggleBanner(b.id, !b.is_active)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!confirmDelete) return
    startTransition(async () => {
      await deleteBanner(confirmDelete.id)
      setConfirmDelete(null)
      router.refresh()
    })
  }

  const stats = [
    { label: 'BANNERS', value: totals.total, icon: Megaphone },
    { label: 'ATIVOS', value: totals.active, icon: Power },
    { label: 'IMPRESSÕES', value: totals.impressions.toLocaleString('pt-BR'), icon: Eye },
    { label: 'CLIQUES', value: totals.clicks.toLocaleString('pt-BR'), icon: MousePointerClick },
  ]

  return (
    <div>
      {/* Métricas */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-3xl border border-white/8 bg-card p-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gold/10">
              <Icon className="size-4 text-gold" aria-hidden="true" />
            </span>
            <p className="mt-4 font-numeric text-2xl font-bold">{value}</p>
            <p className="mt-1 text-[8px] font-black tracking-[0.2em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[10px] font-black tracking-[0.2em] text-muted-foreground">
          GERENCIAR ANÚNCIOS
        </p>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-full bg-gold/15 px-5 py-3 text-[10px] font-black tracking-[0.2em] text-gold transition-colors hover:bg-gold/25"
        >
          <Plus className="size-4" aria-hidden="true" />
          NOVO BANNER
        </button>
      </div>

      {error && !editing && !confirmDelete && (
        <p role="alert" className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-bold text-destructive">
          {error}
        </p>
      )}

      {/* Grupos por posição */}
      <div className="mt-4 flex flex-col gap-8">
        {grouped.map(({ placement, items }) => (
          <section key={placement} aria-label={AD_PLACEMENT_LABELS[placement]}>
            <h3 className="text-[10px] font-black tracking-[0.25em] text-gold">
              {AD_PLACEMENT_LABELS[placement].toUpperCase()}
            </h3>
            {items.length === 0 ? (
              <p className="mt-3 rounded-3xl border border-dashed border-white/10 bg-card/40 p-6 text-center text-xs font-bold text-muted-foreground">
                Nenhum banner nesta posição.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {items.map((b) => (
                  <li
                    key={b.id}
                    className="flex flex-col gap-4 rounded-3xl border border-white/8 bg-card p-4 sm:flex-row sm:items-center"
                  >
                    <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-2xl border border-white/8 bg-background sm:h-20 sm:w-36">
                      {b.image_url ? (
                        <Image src={b.image_url} alt="" fill sizes="160px" className="object-cover" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-muted-foreground">
                          <ImageIcon className="size-6" aria-hidden="true" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="size-3 shrink-0 rounded-full"
                          style={{ backgroundColor: b.accent_color ?? '#ff6b00' }}
                          aria-hidden="true"
                        />
                        <p className="truncate font-serif text-base font-extrabold">{b.title}</p>
                        <span
                          className={
                            b.is_active
                              ? 'rounded-full bg-gold/15 px-2 py-0.5 text-[8px] font-black tracking-[0.1em] text-gold'
                              : 'rounded-full bg-white/5 px-2 py-0.5 text-[8px] font-black tracking-[0.1em] text-muted-foreground'
                          }
                        >
                          {b.is_active ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </div>
                      {b.subtitle && (
                        <p className="mt-1 truncate text-xs font-bold text-muted-foreground">{b.subtitle}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-bold text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" aria-hidden="true" />
                          {b.impressions.toLocaleString('pt-BR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="size-3" aria-hidden="true" />
                          {b.clicks.toLocaleString('pt-BR')}
                        </span>
                        <span className="font-numeric text-gold">CTR {ctr(b)}</span>
                        <span>Ordem {b.sort_order}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(b)}
                        disabled={isPending}
                        aria-label={b.is_active ? 'Desativar' : 'Ativar'}
                        className="flex items-center justify-center rounded-full border border-white/8 bg-white/5 px-3.5 py-2.5 transition-colors hover:bg-secondary disabled:opacity-50"
                      >
                        <Power className={b.is_active ? 'size-3.5 text-gold' : 'size-3.5 text-muted-foreground'} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="flex items-center gap-2 rounded-full bg-gold/15 px-4 py-2.5 text-[9px] font-black tracking-[0.15em] text-gold transition-colors hover:bg-gold/25"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        EDITAR
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(b)}
                        aria-label={`Excluir ${b.title}`}
                        className="flex items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-destructive transition-colors hover:bg-destructive/20"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* Modal criar/editar */}
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="banner-form-title"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-6"
        >
          <div className="my-4 w-full max-w-lg rounded-3xl border border-white/8 bg-card p-6">
            <div className="flex items-center justify-between">
              <h2 id="banner-form-title" className="font-serif text-lg font-black">
                {editing === 'new' ? 'NOVO BANNER' : 'EDITAR BANNER'}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Fechar"
                className="flex size-9 items-center justify-center rounded-full border border-white/8"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <Field label="TÍTULO *">
                <input
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Ex.: Festival WordFan 2026"
                  className={inputClass}
                />
              </Field>
              <Field label="SUBTÍTULO">
                <input
                  value={form.subtitle}
                  onChange={(e) => set('subtitle', e.target.value)}
                  placeholder="Ex.: O maior encontro de fãs e artistas"
                  className={inputClass}
                />
              </Field>
              <Field label="DESCRIÇÃO">
                <textarea
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Texto complementar do anúncio"
                  rows={2}
                  className={inputClass}
                />
              </Field>
              <Field label="URL DA IMAGEM">
                <input
                  value={form.image_url}
                  onChange={(e) => set('image_url', e.target.value)}
                  placeholder="/ads/meu-banner.png ou https://..."
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="TEXTO DO BOTÃO">
                  <input
                    value={form.cta_label}
                    onChange={(e) => set('cta_label', e.target.value)}
                    placeholder="SAIBA MAIS"
                    className={inputClass}
                  />
                </Field>
                <Field label="LINK DO BOTÃO">
                  <input
                    value={form.cta_url}
                    onChange={(e) => set('cta_url', e.target.value)}
                    placeholder="/search"
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="POSIÇÃO">
                  <select
                    value={form.placement}
                    onChange={(e) => set('placement', e.target.value)}
                    className={inputClass}
                  >
                    {PLACEMENTS.map((p) => (
                      <option key={p} value={p} className="bg-card">
                        {AD_PLACEMENT_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ORDEM">
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => set('sort_order', Number(e.target.value))}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="INÍCIO (OPCIONAL)">
                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => set('starts_at', e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="FIM (OPCIONAL)">
                  <input
                    type="datetime-local"
                    value={form.ends_at}
                    onChange={(e) => set('ends_at', e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              <div className="flex items-center gap-4">
                <Field label="COR DE DESTAQUE">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.accent_color}
                      onChange={(e) => set('accent_color', e.target.value)}
                      className="size-11 shrink-0 cursor-pointer rounded-2xl border border-white/8 bg-background"
                      aria-label="Cor de destaque"
                    />
                    <input
                      value={form.accent_color}
                      onChange={(e) => set('accent_color', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </Field>
                <label className="flex cursor-pointer flex-col gap-1.5">
                  <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">ATIVO</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.is_active}
                    onClick={() => set('is_active', !form.is_active)}
                    className={
                      form.is_active
                        ? 'flex h-11 w-16 items-center rounded-full bg-gold px-1'
                        : 'flex h-11 w-16 items-center rounded-full bg-white/10 px-1'
                    }
                  >
                    <span
                      className={
                        form.is_active
                          ? 'size-9 translate-x-5 rounded-full bg-black transition-transform'
                          : 'size-9 translate-x-0 rounded-full bg-white transition-transform'
                      }
                    />
                  </button>
                </label>
              </div>

              {error && (
                <p role="alert" className="text-xs font-bold text-destructive">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !form.title.trim()}
                className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-gold py-4 text-[10px] font-black tracking-[0.25em] text-black disabled:opacity-50"
              >
                {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {isPending ? 'SALVANDO...' : editing === 'new' ? 'CRIAR BANNER' : 'SALVAR ALTERAÇÕES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {confirmDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-banner-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
        >
          <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15">
                <AlertTriangle className="size-5 text-destructive" aria-hidden="true" />
              </span>
              <h2 id="delete-banner-title" className="font-serif text-lg font-black">
                EXCLUIR BANNER?
              </h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              O banner <span className="font-bold text-foreground">{confirmDelete.title}</span> será removido
              permanentemente.
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

const inputClass =
  'w-full rounded-2xl border border-white/8 bg-background px-4 py-3 text-sm font-medium outline-none transition-colors focus:border-gold'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-1 flex-col gap-1.5">
      <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
