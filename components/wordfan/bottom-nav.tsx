'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Compass, Sparkles, CalendarDays, CircleUser } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/home', label: 'Início', icon: House, match: ['/home'] },
  { href: '/search', label: 'Explorar', icon: Compass, match: ['/search'] },
  { href: '/home', label: 'Fan Club', icon: Sparkles, match: ['/artist', '/club'], club: true },
  { href: '/notifications', label: 'Eventos', icon: CalendarDays, match: ['/notifications'] },
  { href: '/profile', label: 'Perfil', icon: CircleUser, match: ['/profile'] },
]

export function BottomNav({ accent = 'brand' }: { accent?: 'brand' | 'club' }) {
  const pathname = usePathname()
  const activeColor = accent === 'club' ? 'text-club' : 'text-brand'

  return (
    <nav
      aria-label="Navegação principal"
      className="tap-none fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md"
    >
      {/* hairline superior + material translúcido (padrão iOS Tab Bar) */}
      <div className="ios-material-thick border-t border-border pb-safe">
        <ul className="flex items-stretch px-1 pt-1.5">
          {tabs.map((tab) => {
            const active = tab.match.some(
              (m) => pathname === m || pathname.startsWith(m + '/'),
            )
            const Icon = tab.icon
            return (
              <li key={tab.label} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 rounded-lg py-1 transition-colors',
                    active ? activeColor : 'text-[color:var(--label-secondary)]',
                  )}
                >
                  <Icon
                    className="size-[26px]"
                    strokeWidth={active ? 2.4 : 2}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] font-medium leading-none tracking-[-0.01em]">
                    {tab.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
