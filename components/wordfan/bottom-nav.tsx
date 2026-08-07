'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/home', label: 'Início', icon: Home },
  { href: '/search', label: 'Pesquisar', icon: Search },
  { href: '/notifications', label: 'Alertas', icon: Bell },
  { href: '/profile', label: 'Perfil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md px-4 pb-4 md:max-w-lg"
    >
      <div className="glass flex items-center justify-around rounded-2xl px-2 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-[11px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
