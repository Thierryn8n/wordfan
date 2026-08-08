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
  { href: '/events', label: 'EVENTS', icon: Calendar },
  { href: '/profile', label: 'PROFILE', icon: User },
]

export function BottomNav({ accent = 'brand' }: { accent?: 'brand' | 'club' }) {
  const pathname = usePathname()
  const clubActive = pathname.startsWith('/artist') || pathname === '/club'

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Home }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex flex-1 flex-col items-center gap-1.5 py-1 text-[8px] font-extrabold tracking-[0.1em] transition-colors',
          active
            ? accent === 'club'
              ? 'text-club'
              : 'text-brand'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-2xl transition-colors',
            active ? 'bg-white/8' : 'bg-transparent',
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
      <div className="nav-float pointer-events-auto relative rounded-[30px] px-3 pb-2 pt-3">
        <div className="flex items-end">
          {left.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Botão central elevado FAN CLUB */}
          <div className="relative z-10 flex flex-1 flex-col items-center gap-1.5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-8 left-1/2 size-[74px] -translate-x-1/2 rounded-full bg-background/70"
            />
            <Link
              href="/home"
              aria-label="Fan Club"
              className={cn(
                'elev-2 -mt-11 flex size-16 items-center justify-center rounded-full text-white ring-1 ring-white/25 transition-transform active:scale-95',
                accent === 'club' ? 'gradient-club' : 'gradient-brand',
              )}
            >
              <Star className="size-7 fill-white" aria-hidden="true" />
            </Link>
            <span
              className={cn(
                'whitespace-nowrap pt-0.5 text-[8px] font-extrabold tracking-[0.1em]',
                clubActive
                  ? accent === 'club'
                    ? 'text-club'
                    : 'text-brand'
                  : accent === 'club'
                    ? 'text-club'
                    : 'text-brand',
              )}
            >
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
