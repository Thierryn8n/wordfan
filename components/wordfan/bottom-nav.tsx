'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Home, Search, Star, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type Item = { href: string; label: string; icon: typeof Home }

// Ordem visual: 2 itens, botão central elevado, 2 itens.
const NAV: Item[] = [
  { href: '/home', label: 'HOME', icon: Home },
  { href: '/search', label: 'DISCOVER', icon: Search },
  { href: '/notifications', label: 'EVENTS', icon: Calendar },
  { href: '/profile', label: 'PROFILE', icon: User },
]

export function BottomNav({ accent = 'brand' }: { accent?: 'brand' | 'club' }) {
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [blob, setBlob] = useState<{ x: number; w: number } | null>(null)

  const activeIndex = NAV.findIndex(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  )
  const clubActive = pathname.startsWith('/artist') || pathname === '/club'

  // Mede a posição do item ativo para posicionar o blob líquido.
  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current
      const el = activeIndex >= 0 ? itemRefs.current[activeIndex] : null
      if (!container || !el) {
        setBlob(null)
        return
      }
      const cRect = container.getBoundingClientRect()
      const rect = el.getBoundingClientRect()
      setBlob({ x: rect.left - cRect.left + rect.width / 2, w: 54 })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activeIndex])

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md"
    >
      {/* Filtro gooey p/ o efeito líquido (metaball) */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <filter id="nav-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="relative rounded-t-[34px] border border-b-0 border-white/10 bg-black/85 px-4 pb-5 pt-4 backdrop-blur-2xl">
        {/* brilho superior */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />

        <div ref={containerRef} className="relative flex items-end">
          {/* Camada líquida: dois blobs que se fundem ao deslizar */}
          {blob && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-1 h-12"
              style={{ filter: 'url(#nav-goo)' }}
            >
              <span
                className={cn(
                  'absolute top-0 size-12 -translate-x-1/2 rounded-full',
                  accent === 'club' ? 'bg-club' : 'bg-brand',
                )}
                style={{
                  left: blob.x,
                  transition: 'left 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              />
              <span
                className={cn(
                  'absolute top-1.5 size-9 -translate-x-1/2 rounded-full opacity-90',
                  accent === 'club' ? 'bg-club' : 'bg-brand',
                )}
                style={{
                  left: blob.x,
                  transition: 'left 640ms cubic-bezier(0.22, 1, 0.36, 1) 40ms',
                }}
              />
            </div>
          )}

          {/* Itens à esquerda */}
          {NAV.slice(0, 2).map((item, i) => (
            <NavItem
              key={item.href}
              item={item}
              accent={accent}
              active={activeIndex === i}
              ref={(el) => {
                itemRefs.current[i] = el
              }}
            />
          ))}

          {/* Botão central elevado FAN CLUB */}
          <Link
            href="/home"
            aria-label="Fan Club"
            className="relative z-10 -mt-10 flex flex-1 flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                'flex size-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 active:scale-90',
                accent === 'club' ? 'gradient-club shadow-club/40' : 'gradient-brand shadow-brand/40',
              )}
            >
              <Star className="size-6 fill-white" aria-hidden="true" />
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-[8px] font-extrabold tracking-[0.08em]',
                accent === 'club' ? 'text-club' : 'text-brand',
                clubActive && 'opacity-100',
              )}
            >
              FAN CLUB
            </span>
          </Link>

          {/* Itens à direita */}
          {NAV.slice(2).map((item, i) => (
            <NavItem
              key={item.href}
              item={item}
              accent={accent}
              active={activeIndex === i + 2}
              ref={(el) => {
                itemRefs.current[i + 2] = el
              }}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}

const NavItem = function NavItem({
  item,
  active,
  accent,
  ref,
}: {
  item: Item
  active: boolean
  accent: 'brand' | 'club'
  ref: (el: HTMLAnchorElement | null) => void
}) {
  const { href, label, icon: Icon } = item
  return (
    <Link
      ref={ref}
      href={href}
      aria-current={active ? 'page' : undefined}
      className="relative z-10 flex flex-1 flex-col items-center gap-1.5 py-1 text-[8px] font-extrabold tracking-[0.08em]"
    >
      <Icon
        className={cn(
          'size-5 transition-all duration-300',
          active
            ? 'scale-110 text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.35)]'
            : 'text-muted-foreground',
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'transition-colors duration-300',
          active ? 'text-white' : 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </Link>
  )
}
