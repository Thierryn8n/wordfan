import Link from 'next/link'
import Image from 'next/image'
import { getUpcomingShows, getUpcomingLives, getActiveAds } from '@/lib/data'
import { AdBanner } from '@/components/wordfan/ad-banner'
import { Radio, CalendarDays, Ticket, ChevronRight } from 'lucide-react'
import { EventsAgenda } from './events-agenda'

export const metadata = { title: 'Eventos — WordFan' }

export default async function EventsPage() {
  const [shows, lives, ads] = await Promise.all([
    getUpcomingShows(60),
    getUpcomingLives(20),
    getActiveAds('events'),
  ])

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
            <div className="mt-5">
              <EventsAgenda shows={shows} />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
