'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Star, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const left = [
  { href: '/home', label: 'HOME', icon: Home },
  { href: '/search', label: 'DISCOVER', icon: Search },
]
const right = [
  { href: '/notifications', label: 'EVENTS', icon: Calendar },
  { href: '/profile', label: 'PROFILE', icon: User },
]

export function BottomNav({ accent = 'brand' }: { accent?: 'brand' | 'club' }) {
  const pathname = usePathname()

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Home }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex flex-1 flex-col items-center gap-1.5 py-1 text-[8px] font-extrabold tracking-[0.08em] transition-colors',
          active
            ? accent === 'club'
              ? 'text-club'
              : 'text-brand'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-2xl transition-all',
            active ? 'skeu-inset' : 'bg-transparent group-hover:bg-white/5',
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-5"
    >
      <div className="nav-dock sheen pointer-events-auto relative rounded-[32px] px-3 pb-2 pt-3">
        <div className="flex items-end">
          {left.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Slot central — orbe elevado e destacado (z acima do dock) */}
          <div className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
            {/* recorte/pedestal atrás do orbe */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-7 left-1/2 size-[74px] -translate-x-1/2 rounded-full bg-background/80"
            />
            <Link
              href="/home"
              aria-label="Fan Club"
              className="nav-orb -mt-11 flex size-16 items-center justify-center rounded-full text-white"
            >
              <Star className="size-7 fill-white drop-shadow" aria-hidden="true" />
            </Link>
            <span className="whitespace-nowrap pt-0.5 text-[8px] font-extrabold tracking-[0.08em] text-club">
              FAN CLUB
            </span>
          </div>

          {right.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  )
}
