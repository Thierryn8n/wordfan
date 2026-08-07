import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import type { Notification } from '@/lib/types'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Notificações — WordFan' }

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `há ${Math.max(mins, 1)} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  return `há ${Math.floor(hours / 24)}d`
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
    <div className="mx-auto min-h-dvh max-w-md pb-28 md:max-w-lg">
      <main className="px-5 pt-6">
        <h1 className="font-serif text-2xl font-bold">Notificações</h1>

        {notifications.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center">
            <span className="glass flex size-14 items-center justify-center rounded-full">
              <Bell className="size-6 text-muted-foreground" aria-hidden="true" />
            </span>
            <p className="font-medium">Nada por aqui ainda</p>
            <p className="max-w-60 text-sm text-muted-foreground text-pretty">
              Assine um fan club para receber novidades dos seus artistas.
            </p>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn('glass flex gap-3 rounded-2xl p-4', !n.read && 'border-primary/30')}
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    n.read ? 'bg-border' : 'gradient-brand',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
