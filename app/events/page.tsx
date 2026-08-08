import Link from 'next/link'
import Image from 'next/image'
import { getUpcomingShows, getUpcomingLives, getActiveAds } from '@/lib/data'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { AdBanner } from '@/components/wordfan/ad-banner'
import { Radio, MapPin, CalendarDays, Ticket, ChevronRight } from 'lucide-react'

export const metadata = { title: 'Eventos — WordFan' }

const MONTHS = [
  'JANEIRO',
  'FEVEREIRO',
  'MARÇO',
  'ABRIL',
  'MAIO',
  'JUNHO',
  'JULHO',
  'AGOSTO',
  'SETEMBRO',
  'OUTUBRO',
  'NOVEMBRO',
  'DEZEMBRO',
]

export default async function EventsPage() {
  const [shows, lives, ads] = await Promise.all([
    getUpcomingShows(60),
    getUpcomingLives(20),
    getActiveAds('events'),
  ])

  // Agrupa shows por mês/ano
  const groups = new Map<string, typeof shows>()
  for (const s of shows) {
    const d = new Date(s.starts_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const arr = groups.get(key) ?? []
    arr.push(s)
    groups.set(key, arr)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-40">
      <header className="px-6 pt-10">
        <p className="text-[10px] font-black tracking-[0.3em] text-brand">O QUE VEM AÍ</p>
        <h1 className="mt-1 font-serif text-4xl font-black tracking-tight">
          <span className="text-gradient-brand">EVENTOS</span>
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground text-pretty">
          Lives exclusivas e shows dos seus artistas favoritos, tudo em um só lugar.
        </p>
      </header>

      <main className="mt-8 px-6">
        {/* Lives */}
        {lives.length > 0 && (
          <section aria-labelledby="lives-heading">
            <h2
              id="lives-heading"
              className="flex items-center gap-2 text-sm font-extrabold tracking-[0.2em]"
            >
              <Radio className="size-4 text-brand" aria-hidden="true" />
              LIVES
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              {lives.map((l) => {
                const isLive = l.status === 'live'
                const d = new Date(l.scheduled_at)
                return (
                  <Link
                    key={l.id}
                    href={`/artist/${l.artist.slug}/live`}
                    className="surface elev-1 flex items-center gap-4 rounded-[26px] p-3"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
                      <Image
                        src={l.artist.avatar_url || '/placeholder.svg?height=64&width=64'}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isLive ? (
                          <span className="flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[8px] font-black tracking-[0.15em] text-white">
                            <span className="size-1 animate-pulse rounded-full bg-white" aria-hidden="true" />
                            AO VIVO
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[8px] font-black tracking-[0.15em] text-muted-foreground">
                            {d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} •{' '}
                            {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className="mt-1.5 line-clamp-1 text-sm font-extrabold">{l.title}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-muted-foreground">
                        {l.artist.name}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-zinc-600" aria-hidden="true" />
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Anúncio */}
        {ads.length > 0 && (
          <div className="mt-8">
            <AdBanner ad={ads[0]} variant="inline" />
          </div>
        )}

        {/* Agenda de shows */}
        <section aria-labelledby="agenda-heading" className="mt-10">
          <h2
            id="agenda-heading"
            className="flex items-center gap-2 text-sm font-extrabold tracking-[0.2em]"
          >
            <CalendarDays className="size-4 text-brand" aria-hidden="true" />
            AGENDA DE SHOWS
          </h2>

          {shows.length === 0 ? (
            <div className="surface mt-4 flex flex-col items-center gap-3 rounded-[28px] p-10 text-center">
              <Ticket className="size-7 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs font-bold text-muted-foreground text-pretty">
                Nenhum show agendado no momento. Volte em breve!
              </p>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-8">
              {Array.from(groups.entries()).map(([key, items]) => {
                const [, monthIdx] = key.split('-').map(Number)
                return (
                  <div key={key}>
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
                        {MONTHS[monthIdx]}
                      </p>
                      <span className="hairline flex-1" aria-hidden="true" />
                    </div>
                    <ul className="mt-4 flex flex-col gap-3">
                      {items.map((s) => {
                        const d = new Date(s.starts_at)
                        return (
                          <li key={s.id}>
                            <Link
                              href={`/artist/${s.artist.slug}`}
                              className="surface elev-1 flex items-center gap-4 rounded-[26px] p-4"
                            >
                              <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-white/5">
                                <span className="font-numeric text-2xl font-black leading-none">
                                  {d.getDate()}
                                </span>
                                <span className="mt-1 text-[8px] font-black tracking-[0.15em] text-muted-foreground">
                                  {d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-sm font-extrabold tracking-[0.05em]">
                                  {s.title}
                                </p>
                                <p className="mt-1 text-[11px] font-bold text-brand">
                                  {s.artist.name}
                                </p>
                                <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-zinc-500">
                                  <MapPin className="size-2.5 shrink-0" aria-hidden="true" />
                                  <span className="truncate">
                                    {s.venue ? `${s.venue} • ` : ''}
                                    {s.city || 'A definir'}
                                    {s.state ? `, ${s.state}` : ''}
                                  </span>
                                </p>
                              </div>
                              <span className="font-numeric text-[11px] font-bold text-muted-foreground">
                                {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
