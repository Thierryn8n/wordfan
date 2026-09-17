'use client'

import { useMemo, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const RouteMap = dynamic(() => import('@/components/wordfan/route-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] w-full items-center justify-center rounded-2xl border border-white/10 bg-[var(--artist-bg)] text-[11px] font-bold text-[var(--artist-muted)]">
      Carregando mapa…
    </div>
  ),
})
import {
  Banknote,
  CalendarClock,
  CreditCard,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Printer,
  Route as RouteIcon,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { saveShow, deleteShow } from '@/app/dashboard/agenda/actions'
import {
  DEAL_STATUS_LABELS,
  SHOW_STATUS_LABELS,
  type DealStatus,
  type Show,
  type ShowStatus,
} from '@/lib/types'

interface AgendaClientProps {
  shows: Show[]
}

interface RouteStep {
  instruction: string
  distance: string
  duration: string
}

interface RouteResult {
  origin: { address: string; lat: number; lng: number }
  destination: { address: string; lat: number; lng: number }
  distance: string
  duration: string
  summary: string
  polyline: string
  steps: RouteStep[]
}

const DEAL_STATUS_CLS: Record<DealStatus, string> = {
  pendente: 'bg-amber-500/15 text-amber-400',
  confirmado: 'bg-emerald-500/15 text-emerald-400',
  revisao: 'bg-sky-500/15 text-sky-400',
}

const SHOW_STATUS_CLS: Record<ShowStatus, string> = {
  scheduled: 'bg-[var(--artist-primary)]/15 text-[var(--artist-primary)]',
  done: 'bg-white/10 text-[var(--artist-muted)]',
  canceled: 'bg-red-500/15 text-red-400',
}

function locationText(s: Show) {
  if (s.address) return s.address
  return [s.venue, s.city, s.state].filter(Boolean).join(', ')
}

function money(v: number | null) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** ISO → valor para <input type="datetime-local"> no fuso local. */
function toLocalInput(iso: string) {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}

/** Renderizador leve de Markdown (títulos ##, listas -, negrito **). */
function Markdown({ text }: { text: string }) {
  const blocks = text.split('\n')
  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((line, i) => {
        const t = line.trim()
        if (!t) return null
        if (t.startsWith('## ')) {
          return (
            <h4
              key={i}
              className="mt-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-[var(--artist-primary)]"
            >
              {t.slice(3)}
            </h4>
          )
        }
        if (t.startsWith('# ')) {
          return (
            <h3 key={i} className="text-sm font-black text-[var(--artist-text)]">
              {t.slice(2)}
            </h3>
          )
        }
        const bullet = /^[-*]\s+/.test(t)
        const content = bullet ? t.replace(/^[-*]\s+/, '') : t
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith('**') && p.endsWith('**') ? (
            <strong key={j} className="font-black text-[var(--artist-text)]">
              {p.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{p}</span>
          ),
        )
        return (
          <p
            key={i}
            className={`text-xs font-medium leading-relaxed text-[var(--artist-text)]/85 ${bullet ? 'flex gap-2 pl-1' : ''}`}
          >
            {bullet && <span className="mt-1.5 size-1 shrink-0 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />}
            <span>{parts}</span>
          </p>
        )
      })}
    </div>
  )
}

export function AgendaClient({ shows }: AgendaClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const now = Date.now()
  const defaults = useMemo(() => {
    const past = shows.filter((s) => new Date(s.starts_at).getTime() < now)
    const upcoming = shows.filter((s) => new Date(s.starts_at).getTime() >= now)
    const origin = past.length ? past[past.length - 1] : shows[0]
    const destination = upcoming.length ? upcoming[0] : shows[shows.length - 1]
    return { originId: origin?.id ?? '', destinationId: destination?.id ?? '' }
  }, [shows, now])

  const [originId, setOriginId] = useState(defaults.originId)
  const [destinationId, setDestinationId] = useState(defaults.destinationId)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [reasoning, setReasoning] = useState<string>('')
  const [analysisModel, setAnalysisModel] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Show | null>(null)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const originShow = shows.find((s) => s.id === originId) ?? null
  const destinationShow = shows.find((s) => s.id === destinationId) ?? null

  async function traceRoute() {
    if (!originShow || !destinationShow) {
      setRouteError('Selecione o show de origem e o próximo show.')
      return
    }
    if (originShow.id === destinationShow.id) {
      setRouteError('Origem e destino não podem ser o mesmo show.')
      return
    }
    setRouteLoading(true)
    setRouteError(null)
    setRoute(null)
    setAnalysis(null)
    setAnalysisError(null)
    try {
      const res = await fetch('/api/agenda/directions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originText: locationText(originShow),
          destinationText: locationText(destinationShow),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setRouteError(data.error ?? 'Não foi possível traçar a rota.')
        return
      }
      setRoute(data as RouteResult)
    } catch {
      setRouteError('Falha de conexão ao traçar a rota.')
    } finally {
      setRouteLoading(false)
    }
  }

  async function runAnalysis() {
    if (!route) return
    setAnalysisLoading(true)
    setAnalysisError(null)
    setAnalysis(null)
    setReasoning('')
    try {
      const res = await fetch('/api/agenda/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: route.origin.address,
          destination: route.destination.address,
          distance: route.distance,
          duration: route.duration,
          summary: route.summary,
          originShow: originShow?.title,
          destinationShow: destinationShow?.title,
          showDateISO: destinationShow?.starts_at,
          steps: route.steps,
        }),
      })
      if (!res.ok || !res.body) {
        let msg = 'A análise falhou.'
        try {
          const data = await res.json()
          msg = data.error ?? msg
        } catch {}
        setAnalysisError(msg)
        return
      }

      setAnalysisModel(res.headers.get('X-Model'))

      const CONTENT_MARKER = '\u0000__RESPOSTA__\u0000'
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        const markerAt = acc.indexOf(CONTENT_MARKER)
        if (markerAt === -1) {
          // Ainda na fase de raciocínio.
          setReasoning(acc)
        } else {
          // Virou para a resposta final.
          setReasoning(acc.slice(0, markerAt))
          setAnalysis(acc.slice(markerAt + CONTENT_MARKER.length))
        }
      }
      const finalMarkerAt = acc.indexOf(CONTENT_MARKER)
      const finalAnswer = finalMarkerAt === -1 ? '' : acc.slice(finalMarkerAt + CONTENT_MARKER.length)
      if (!finalAnswer.trim()) {
        setAnalysisError('A IA não retornou uma resposta final. Tente novamente.')
      }
    } catch {
      setAnalysisError('Falha de conexão com a IA.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const wazeUrl = route
    ? `https://waze.com/ul?ll=${route.destination.lat}%2C${route.destination.lng}&navigate=yes`
    : '#'
  const gmapsUrl = route
    ? `https://www.google.com/maps/dir/?api=1&origin=${route.origin.lat},${route.origin.lng}&destination=${route.destination.lat},${route.destination.lng}&travelmode=driving`
    : '#'

  function printRoute() {
    if (!route) return
    const stepsHtml = route.steps
      .map(
        (s, i) =>
          `<li><span class="n">${i + 1}</span><span class="i">${s.instruction}</span><span class="m">${s.distance} · ${s.duration}</span></li>`,
      )
      .join('')
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Rota — ${originShow?.title ?? ''} → ${destinationShow?.title ?? ''}</title>
<style>
*{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
body{margin:32px;color:#111}
h1{font-size:20px;margin:0 0 4px}
.sub{color:#666;font-size:13px;margin:0 0 16px}
.box{display:flex;gap:24px;margin:12px 0 20px;font-size:13px}
.box b{display:block;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:2px}
img{width:100%;max-width:720px;border-radius:12px;border:1px solid #ddd}
.legs{display:flex;gap:32px;margin:16px 0}
.legs div b{display:block;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em}
.legs div span{font-size:16px;font-weight:bold}
ol{padding:0;margin:0;list-style:none}
li{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #eee;font-size:13px;align-items:baseline}
.n{width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:#6d28d9;color:#fff;font-size:11px;font-weight:bold;display:inline-flex;align-items:center;justify-content:center}
.i{flex:1}
.m{color:#888;font-size:12px;white-space:nowrap}
@media print{body{margin:16px}}
</style></head><body>
<h1>Rota de estrada — WordFan</h1>
<p class="sub">${originShow?.title ?? ''} → ${destinationShow?.title ?? ''}</p>
<div class="box">
<div><b>Origem</b>${route.origin.address}</div>
<div><b>Destino</b>${route.destination.address}</div>
</div>
<div class="legs">
<div><b>Distância</b><span>${route.distance}</span></div>
<div><b>Duração</b><span>${route.duration}</span></div>
<div><b>Vias</b><span>${route.summary || '—'}</span></div>
</div>
<h1 style="font-size:15px">Passo a passo</h1>
<ol>${stepsHtml}</ol>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body></html>`
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  function submitForm(formData: FormData) {
    setFormError(null)
    startTransition(async () => {
      const result = await saveShow(formData)
      if (!result.ok) {
        setFormError(result.error ?? 'Erro ao salvar.')
        return
      }
      setEditing(null)
      setCreating(false)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir este show da agenda?')) return
    startTransition(async () => {
      await deleteShow(id)
      router.refresh()
    })
  }

  const showFormOpen = creating || editing !== null

  return (
    <div className="flex flex-col gap-6">
      {/* ── Rota inteligente ── */}
      <section className="rounded-3xl border border-white/10 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--artist-primary)]/15 text-[var(--artist-primary)]">
            <RouteIcon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-serif text-base font-black text-[var(--artist-text)]">Rota inteligente</h2>
            <p className="text-[11px] font-bold text-[var(--artist-muted)]">
              Trace a melhor rota entre o show atual e o próximo
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--artist-muted)]">
              Show de origem (de onde sai)
            </span>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="agenda-input"
            >
              <option value="">Selecione…</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.city ?? 'sem cidade'} ({fmtDate(s.starts_at)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--artist-muted)]">
              Próximo show (destino)
            </span>
            <select
              value={destinationId}
              onChange={(e) => setDestinationId(e.target.value)}
              className="agenda-input"
            >
              <option value="">Selecione…</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.city ?? 'sem cidade'} ({fmtDate(s.starts_at)})
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={traceRoute}
          disabled={routeLoading}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--artist-primary)] px-4 py-2.5 text-xs font-black text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {routeLoading ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
          Traçar melhor rota
        </button>

        {routeError && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-400">{routeError}</p>
        )}

        {route && (
          <div className="mt-5 flex flex-col gap-4">
            <RouteMap
              polyline={route.polyline}
              origin={{ lat: route.origin.lat, lng: route.origin.lng, label: route.origin.address }}
              destination={{
                lat: route.destination.lat,
                lng: route.destination.lng,
                label: route.destination.address,
              }}
              className="h-[320px] w-full overflow-hidden rounded-2xl border border-white/10"
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[var(--artist-bg)] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--artist-muted)]">Distância</p>
                <p className="mt-1 font-numeric text-lg font-black text-[var(--artist-text)]">{route.distance}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[var(--artist-bg)] p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--artist-muted)]">Duração</p>
                <p className="mt-1 font-numeric text-lg font-black text-[var(--artist-text)]">{route.duration}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/10 bg-[var(--artist-bg)] p-4 sm:col-span-1">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--artist-muted)]">Vias</p>
                <p className="mt-1 truncate text-sm font-black text-[var(--artist-text)]">{route.summary || '—'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={printRoute}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2 text-[11px] font-black text-[var(--artist-text)] transition-colors hover:bg-white/[0.07]"
              >
                <Printer className="size-3.5" /> Imprimir rota
              </button>
              <a
                href={wazeUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2 text-[11px] font-black text-[var(--artist-text)] transition-colors hover:bg-white/[0.07]"
              >
                <ExternalLink className="size-3.5 text-[#33ccff]" /> Abrir no Waze
              </a>
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-3.5 py-2 text-[11px] font-black text-[var(--artist-text)] transition-colors hover:bg-white/[0.07]"
              >
                <ExternalLink className="size-3.5 text-emerald-400" /> Google Maps
              </a>
              <button
                type="button"
                onClick={runAnalysis}
                disabled={analysisLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[var(--artist-primary)] to-fuchsia-500 px-3.5 py-2 text-[11px] font-black text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {analysisLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Análise por IA
              </button>
            </div>

            {analysisError && (
              <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-400">{analysisError}</p>
            )}

            {analysisLoading && !analysis && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-[var(--artist-primary)]" aria-hidden="true" />
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-white/50">
                    Analisando a rota...
                  </p>
                </div>
                <p className="max-h-24 overflow-hidden text-[11px] leading-relaxed text-white/40">
                  {reasoning ? reasoning.slice(-320) : 'Consultando condições da estrada, horários e paradas.'}
                </p>
              </div>
            )}

            {analysis && (
              <div className="rounded-2xl border border-[var(--artist-primary)]/25 bg-[var(--artist-primary)]/[0.06] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="size-4 text-[var(--artist-primary)]" aria-hidden="true" />
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[var(--artist-primary)]">
                    Briefing da estrada
                  </p>
                  {analysisModel && (
                    <span className="ml-auto truncate text-[9px] font-bold text-[var(--artist-muted)]">
                      {analysisModel}
                    </span>
                  )}
                </div>
                <Markdown text={analysis} />
              </div>
            )}

            {route.steps.length > 0 && (
              <details className="rounded-2xl border border-white/10 bg-[var(--artist-bg)] p-4">
                <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.12em] text-[var(--artist-muted)]">
                  Passo a passo ({route.steps.length})
                </summary>
                <ol className="mt-3 flex flex-col gap-0">
                  {route.steps.map((s, i) => (
                    <li key={i} className="flex items-baseline gap-3 border-b border-white/5 py-2 last:border-0">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--artist-primary)] text-[9px] font-black text-white">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-xs font-medium text-[var(--artist-text)]/85">{s.instruction}</span>
                      <span className="whitespace-nowrap text-[10px] font-bold text-[var(--artist-muted)]">
                        {s.distance} · {s.duration}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </div>
        )}
      </section>

      {/* ── Lista de shows ── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-base font-black text-[var(--artist-text)]">
            Shows <span className="text-[var(--artist-muted)]">({shows.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              setCreating(true)
              setEditing(null)
              setFormError(null)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--artist-primary)] px-3.5 py-2 text-[11px] font-black text-white transition-opacity hover:opacity-90"
          >
            <Plus className="size-4" /> Novo show
          </button>
        </div>

        {shows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/12 bg-card p-12 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[var(--artist-primary)]/10 text-[var(--artist-primary)]">
              <CalendarClock className="size-6" aria-hidden="true" />
            </span>
            <p className="text-sm font-black text-[var(--artist-text)]">Nenhum show na agenda</p>
            <p className="max-w-sm text-[11px] font-bold text-[var(--artist-muted)]">
              Cadastre seus shows com cachê, forma de pagamento, contrato e endereço para calcular rotas
              entre eles.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {shows.map((s) => {
              const st = (s.status ?? 'scheduled') as ShowStatus
              const pay = (s.payment_status ?? 'pendente') as DealStatus
              const con = (s.contract_status ?? 'pendente') as DealStatus
              return (
                <li key={s.id} className="rounded-3xl border border-white/10 bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-serif text-base font-black text-[var(--artist-text)]">{s.title}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${SHOW_STATUS_CLS[st]}`}>
                          {SHOW_STATUS_LABELS[st]}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-[var(--artist-muted)]">
                        <CalendarClock className="size-3.5" aria-hidden="true" />
                        {fmtDate(s.starts_at)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-[var(--artist-muted)]">
                        <MapPin className="size-3.5 text-[var(--artist-primary)]" aria-hidden="true" />
                        {locationText(s) || 'Sem endereço'}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(s)
                          setCreating(false)
                          setFormError(null)
                        }}
                        aria-label="Editar show"
                        className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[var(--artist-muted)] transition-colors hover:bg-white/[0.08] hover:text-[var(--artist-text)]"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        aria-label="Excluir show"
                        className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[var(--artist-muted)] transition-colors hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                    <div className="rounded-2xl bg-[var(--artist-bg)] p-3">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--artist-muted)]">
                        <Banknote className="size-3" /> Cachê
                      </p>
                      <p className="mt-1 font-numeric text-sm font-black text-[var(--artist-text)]">{money(s.fee)}</p>
                    </div>
                    <div className="rounded-2xl bg-[var(--artist-bg)] p-3">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--artist-muted)]">
                        <CreditCard className="size-3" /> Pagamento
                      </p>
                      <p className="mt-1 text-xs font-black text-[var(--artist-text)]">{s.payment_method ?? '—'}</p>
                      <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${DEAL_STATUS_CLS[pay]}`}>
                        {DEAL_STATUS_LABELS[pay]}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-[var(--artist-bg)] p-3">
                      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--artist-muted)]">
                        <FileText className="size-3" /> Contrato
                      </p>
                      <p className="mt-1 text-xs font-black text-[var(--artist-text)]">{s.contract_type ?? '—'}</p>
                      <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] ${DEAL_STATUS_CLS[con]}`}>
                        {DEAL_STATUS_LABELS[con]}
                      </span>
                    </div>
                  </div>

                  {s.contract_notes && (
                    <p className="mt-2.5 rounded-2xl bg-[var(--artist-bg)] p-3 text-[11px] font-medium leading-relaxed text-[var(--artist-text)]/80">
                      {s.contract_notes}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Modal de formulário ── */}
      {showFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0c0c0c] p-5 sm:rounded-3xl sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-black text-[var(--artist-text)]">
                {editing ? 'Editar show' : 'Novo show'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setCreating(false)
                }}
                aria-label="Fechar"
                className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-[var(--artist-muted)] transition-colors hover:bg-white/[0.08] hover:text-[var(--artist-text)]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form action={submitForm} className="mt-4 flex flex-col gap-3.5">
              {editing && <input type="hidden" name="id" value={editing.id} />}

              <label className="agenda-field">
                <span className="agenda-label">Nome do show *</span>
                <input name="title" required defaultValue={editing?.title ?? ''} className="agenda-input" placeholder="Ex.: São João de Caruaru" />
              </label>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="agenda-field">
                  <span className="agenda-label">Data e hora *</span>
                  <input
                    name="starts_at"
                    type="datetime-local"
                    required
                    defaultValue={editing ? toLocalInput(editing.starts_at) : ''}
                    className="agenda-input"
                  />
                </label>
                <label className="agenda-field">
                  <span className="agenda-label">Status do show</span>
                  <select name="status" defaultValue={editing?.status ?? 'scheduled'} className="agenda-input">
                    {(Object.keys(SHOW_STATUS_LABELS) as ShowStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {SHOW_STATUS_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="agenda-field">
                <span className="agenda-label">Local / casa de show</span>
                <input name="venue" defaultValue={editing?.venue ?? ''} className="agenda-input" placeholder="Ex.: Pátio do Forró" />
              </label>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="agenda-field">
                  <span className="agenda-label">Cidade</span>
                  <input name="city" defaultValue={editing?.city ?? ''} className="agenda-input" />
                </label>
                <label className="agenda-field">
                  <span className="agenda-label">Estado (UF)</span>
                  <input name="state" defaultValue={editing?.state ?? ''} maxLength={2} className="agenda-input" placeholder="PE" />
                </label>
              </div>

              <label className="agenda-field">
                <span className="agenda-label">Endereço completo (para rota)</span>
                <input
                  name="address"
                  defaultValue={editing?.address ?? ''}
                  className="agenda-input"
                  placeholder="Rua, número, bairro, cidade — UF"
                />
              </label>

              <div className="my-1 border-t border-white/8 pt-1">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--artist-primary)]">
                  Contratual
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="agenda-field">
                  <span className="agenda-label">Valor / cachê (R$)</span>
                  <input name="fee" inputMode="decimal" defaultValue={editing?.fee ?? ''} className="agenda-input" placeholder="15000" />
                </label>
                <label className="agenda-field">
                  <span className="agenda-label">Forma de pagamento</span>
                  <input
                    name="payment_method"
                    defaultValue={editing?.payment_method ?? ''}
                    className="agenda-input"
                    placeholder="PIX, 50% entrada + 50%..."
                  />
                </label>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                <label className="agenda-field">
                  <span className="agenda-label">Status do pagamento</span>
                  <select name="payment_status" defaultValue={editing?.payment_status ?? 'pendente'} className="agenda-input">
                    {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {DEAL_STATUS_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="agenda-field">
                  <span className="agenda-label">Status do contrato</span>
                  <select name="contract_status" defaultValue={editing?.contract_status ?? 'pendente'} className="agenda-input">
                    {(Object.keys(DEAL_STATUS_LABELS) as DealStatus[]).map((k) => (
                      <option key={k} value={k}>
                        {DEAL_STATUS_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="agenda-field">
                <span className="agenda-label">Tipo de contrato</span>
                <input
                  name="contract_type"
                  defaultValue={editing?.contract_type ?? ''}
                  className="agenda-input"
                  placeholder="Show único, exclusividade regional..."
                />
              </label>

              <label className="agenda-field">
                <span className="agenda-label">Observações do contrato</span>
                <textarea
                  name="contract_notes"
                  defaultValue={editing?.contract_notes ?? ''}
                  rows={3}
                  className="agenda-input resize-none"
                  placeholder="Rider técnico, hospedagem, transporte incluso..."
                />
              </label>

              {formError && (
                <p className="rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-400">{formError}</p>
              )}

              <div className="mt-1 flex gap-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--artist-primary)] px-4 py-3 text-xs font-black text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  {editing ? 'Salvar alterações' : 'Adicionar show'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null)
                    setCreating(false)
                  }}
                  className="rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-xs font-black text-[var(--artist-text)] transition-colors hover:bg-white/[0.07]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
