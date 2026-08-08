import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Notificações — WordFan' }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `HÁ ${Math.max(mins, 1)} MIN`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `HÁ ${hours}H`
  return `HÁ ${Math.floor(hours / 24)}D`
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/notifications')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
  const notifications = (data ?? []) as Notification[]

  // Mark unread as read
  if (notifications.some((n) => !n.read)) {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      <main className="px-6 pt-8">
        <p className="text-[10px] font-black tracking-[0.3em] text-primary">ATUALIZAÇÕES</p>
        <h1 className="mt-1 font-serif text-3xl font-black tracking-tight">NOTIFICAÇÕES</h1>

        {notifications.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <span className="flex size-16 items-center justify-center rounded-full border border-white/8 bg-card">
              <Bell className="size-6 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="font-serif text-sm font-extrabold">NADA POR AQUI AINDA</p>
            <p className="max-w-60 text-xs font-bold leading-relaxed text-muted-foreground text-pretty">
              Assine um fan club para receber novidades dos seus artistas.
            </p>
          </div>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex gap-4 rounded-3xl border border-white/8 bg-card p-5',
                  !n.read && 'border-primary/40',
                )}
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    n.read ? 'bg-white/10' : 'gradient-brand',
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
      </main>
    </div>
  )
}
