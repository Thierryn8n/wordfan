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
  if (hours < 24) return `há ${hours} h`
  return `há ${Math.floor(hours / 24)} d`
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
      <main className="px-4 pt-16">
        <h1 className="ios-large-title">Notificações</h1>

        {notifications.length === 0 ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-[color:var(--ios-fill-2)]">
              <Bell className="size-7 text-[color:var(--label-secondary)]" aria-hidden="true" />
            </span>
            <p className="text-[17px] font-semibold">Nada por aqui ainda</p>
            <p className="max-w-64 text-[15px] leading-relaxed text-[color:var(--label-secondary)] text-pretty">
              Assine um fan club para receber novidades dos seus artistas.
            </p>
          </div>
        ) : (
          <ul className="ios-list mt-4">
            {notifications.map((n) => (
              <li key={n.id} className="ios-row items-start">
                <span
                  className={cn(
                    'mt-2 size-2.5 shrink-0 rounded-full',
                    n.read ? 'bg-transparent' : 'bg-primary',
                  )}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 py-0.5">
                  <p className="text-[17px] font-semibold leading-snug">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-[15px] leading-relaxed text-[color:var(--label-secondary)]">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-1.5 text-[13px] text-[color:var(--label-tertiary)]">
                    {timeAgo(n.created_at)}
                  </p>
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
