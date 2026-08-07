'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Star, Calendar, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLayoutEffect, useRef, useState } from 'react'

const items = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/search', label: 'Discover', icon: Search },
  { href: '/club', label: 'Fan Club', icon: Star, center: true },
  { href: '/notifications', label: 'Events', icon: Calendar },
  { href: '/profile', label: 'Profile', icon: User },
]

export function BottomNav({ accent = 'brand' }: { accent?: 'brand' | 'club' }) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/club') return pathname.startsWith('/artist') || pathname === '/club'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const activeIndex = Math.max(
    0,
    items.findIndex((it) => isActive(it.href)),
  )

  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])
  const [blob, setBlob] = useState<{ left: number; width: number } | null>(null)

  useLayoutEffect(() => {
    const el = itemRefs.current[activeIndex]
    const list = listRef.current
    if (!el || !list) return
    const update = () => {
      const elRect = el.getBoundingClientRect()
      const listRect = list.getBoundingClientRect()
      setBlob({ left: elRect.left - listRect.left, width: elRect.width })
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeIndex])

  const accentColor = accent === 'club' ? 'var(--club)' : 'var(--brand)'

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-md justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div
        className="liquid-glass pointer-events-auto w-full rounded-[28px] px-2 py-2"
        style={{ ['--liquid-accent' as string]: accentColor }}
      >
        <ul ref={listRef} className="relative flex items-center">
          {/* Blob líquido deslizante atrás do item ativo */}
          {blob && (
            <li
              aria-hidden="true"
              className="liquid-blob absolute top-1/2 -z-0 h-12 rounded-2xl"
              style={{
                left: blob.left,
                width: blob.width,
                transform: 'translateY(-50%)',
              }}
            />
          )}

          {items.map((item, i) => {
            const active = i === activeIndex
            const Icon = item.icon
            return (
              <li
                key={item.href}
                ref={(node) => {
                  itemRefs.current[i] = node
                }}
                className="relative z-10 flex-1"
              >
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors duration-300',
                    active ? 'text-white' : 'text-white/55 hover:text-white/80',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-[22px] transition-transform duration-500',
                      active && 'scale-110',
                      item.center && active && 'fill-white/90',
                    )}
                    aria-hidden="true"
                  />
                  <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
