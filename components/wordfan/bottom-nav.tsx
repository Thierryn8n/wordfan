'use client'

import { useEffect, useState } from 'react'
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
  // Destino tocado: destaca a aba na hora do toque, antes de a rota trocar.
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    setPending(null)
  }, [pathname])

  const current = pending ?? pathname
  // Rosa (club) só nas páginas de artista; /fanclub usa o laranja do sistema via `accent`.
  const clubActive = current.startsWith('/artist')

  function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof Home }) {
    const active = current === href || current.startsWith(href + '/')
    return (
      <Link
        href={href}
        onNavigate={() => setPending(href)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex flex-1 flex-col items-center gap-1.5 py-1 text-[8px] font-extrabold tracking-[0.1em] transition-colors duration-200',
          active
            ? accent === 'club'
              ? 'text-club'
              : 'text-brand'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-2xl transition-all duration-300 ease-out active:scale-90',
            active ? 'scale-105 bg-white/10' : 'scale-100 bg-transparent',
          )}
        >
          <Icon className={cn('size-5 transition-transform duration-300', active && '-translate-y-px')} aria-hidden="true" />
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
            <div className="relative -mt-11 flex size-16 items-center justify-center">
              {/* Recorte/plataforma — sempre atrás do botão, simétrico em todas as direções */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-[-7px] -z-10 rounded-full bg-background/70"
              />
              <Link
                href="/fanclub"
                onNavigate={() => setPending('/fanclub')}
                aria-label="Fan Club"
                className={cn(
                  'elev-2 relative z-10 flex size-16 items-center justify-center rounded-full text-white ring-1 ring-white/25 transition-transform duration-200 ease-out active:scale-90',
                  accent === 'club' ? 'gradient-club' : 'gradient-brand',
                )}
              >
                <Star className="size-7 fill-white" aria-hidden="true" />
              </Link>
            </div>
            <span
              className={cn(
                'whitespace-nowrap pt-0.5 text-[8px] font-extrabold tracking-[0.1em] transition-colors duration-200',
                clubActive || accent === 'club' ? 'text-club' : 'text-brand',
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
