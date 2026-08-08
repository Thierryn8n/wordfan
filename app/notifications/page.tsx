import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { Bell, CalendarDays, MapPin, Ticket } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUpcomingShows } from '@/lib/data'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Eventos — WordFan' }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `HÁ ${Math.max(mins, 1)} MIN`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `HÁ ${hours}H`
  return `HÁ ${Math.floor(hours / 24)}D`
}

export default async function EventsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/notifications')

  const [{ data }, shows] = await Promise.all([
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    getUpcomingShows(10),
  ])
  const notifications = (data ?? []) as Notification[]

  if (notifications.some((n) => !n.read)) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      <main className="px-6 pt-10">
        <div className="glass-panel sheen relative rounded-[26px] px-5 py-5">
          <p className="text-[10px] font-black tracking-[0.3em] text-primary">O QUE ESTÁ ROLANDO</p>
          <h1 className="mt-1 font-serif text-3xl font-black tracking-tight">EVENTOS</h1>
        </div>

        {/* Agenda de shows */}
        <section aria-labelledby="agenda-heading" className="mt-8">
          <h2
            id="agenda-heading"
            className="flex items-center gap-2 text-[10px] font-black tracking-[0.25em] text-muted-foreground"
          >
            <CalendarDays className="size-3.5 text-brand" aria-hidden="true" />
            PRÓXIMOS SHOWS
          </h2>

          {shows.length === 0 ? (
            <div className="skeu mt-3 rounded-3xl p-6 text-center text-xs font-bold text-muted-foreground">
              Nenhum show agendado no momento.
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {shows.map((s) => {
                const date = new Date(s.starts_at)
                return (
                  <li key={s.id}>
                    <Link
                      href={s.artist ? `/artist/${s.artist.slug}` : '#'}
                      className="skeu flex items-center gap-4 rounded-3xl p-3"
                    >
                      <span className="skeu-inset flex size-16 shrink-0 flex-col items-center justify-center rounded-2xl">
                        <span className="font-numeric text-xl font-black leading-none text-brand">
                          {date.getDate()}
                        </span>
                        <span className="mt-0.5 text-[8px] font-black tracking-[0.15em] text-muted-foreground">
                          {date.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-extrabold">{s.title}</span>
                        {s.artist && (
                          <span className="mt-0.5 block truncate text-[10px] font-black uppercase tracking-[0.1em] text-primary">
                            {s.artist.name}
                          </span>
                        )}
                        <span className="mt-1 flex items-center gap-1 truncate text-[10px] font-bold text-muted-foreground">
                          <MapPin className="size-3 shrink-0" aria-hidden="true" />
                          {s.venue || s.city || 'A definir'}
                          {s.state ? `, ${s.state}` : ''}
                        </span>
                      </span>
                      {s.artist?.avatar_url && (
                        <Image
                          src={s.artist.avatar_url || '/placeholder.svg'}
                          alt=""
                          width={44}
                          height={44}
                          className="size-11 shrink-0 rounded-2xl object-cover"
                        />
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Notificações */}
        <section aria-labelledby="notif-heading" className="mt-10">
          <h2
            id="notif-heading"
            className="flex items-center gap-2 text-[10px] font-black tracking-[0.25em] text-muted-foreground"
          >
            <Bell className="size-3.5 text-brand" aria-hidden="true" />
            NOTIFICAÇÕES
          </h2>

          {notifications.length === 0 ? (
            <div className="glass-panel sheen relative mt-4 flex flex-col items-center gap-4 rounded-[28px] p-8 text-center">
              <span className="skeu-raised flex size-14 items-center justify-center rounded-2xl">
                <Ticket className="size-6 text-muted-foreground" aria-hidden="true" />
              </span>
              <p className="font-serif text-sm font-extrabold">NADA POR AQUI AINDA</p>
              <p className="max-w-60 text-xs font-bold leading-relaxed text-muted-foreground text-pretty">
                Assine um fan club para receber novidades dos seus artistas.
              </p>
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={cn('skeu flex gap-4 rounded-3xl p-5', !n.read && 'ring-1 ring-brand/40')}
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.read ? 'bg-white/15' : 'bg-brand',
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold">{n.title}</p>
                    {n.body && (
                      <p className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-2 font-numeric text-[9px] font-bold tracking-[0.15em] text-zinc-600">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  )
}
