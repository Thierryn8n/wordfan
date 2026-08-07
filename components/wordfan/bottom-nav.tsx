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
  const clubActive = pathname.startsWith('/artist') || pathname === '/club'

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Home }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex flex-1 flex-col items-center gap-1.5 py-1 text-[8px] font-extrabold tracking-[0.08em] transition-colors',
          active
            ? accent === 'club'
              ? 'text-club'
              : 'text-brand'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
        <span>{label}</span>
      </Link>
    )
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md"
    >
      <div className="relative rounded-t-[32px] border border-b-0 border-white/8 bg-black/90 px-4 pb-5 pt-4 backdrop-blur-xl">
        <div className="flex items-end">
          {left.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}

          {/* Botão central elevado FAN CLUB */}
          <Link
            href="/home"
            aria-label="Fan Club"
            className="relative -mt-10 flex flex-1 flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                'flex size-14 items-center justify-center rounded-2xl text-white shadow-lg',
                accent === 'club'
                  ? 'gradient-club shadow-club/40'
                  : 'gradient-brand shadow-brand/40',
              )}
            >
              <Star className="size-6 fill-white" aria-hidden="true" />
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-[8px] font-extrabold tracking-[0.08em]',
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
          </Link>

          {right.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </div>
    </nav>
  )
}
