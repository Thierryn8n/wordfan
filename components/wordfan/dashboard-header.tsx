import type { ReactNode } from 'react'

export function DashboardHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string
  title: string
  action?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-white/8 pb-4">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[9px] font-black tracking-[0.28em] text-[var(--artist-muted)]">
          <span className="size-1.5 rounded-full bg-[var(--artist-primary)]" aria-hidden="true" />
          {eyebrow}
        </p>
        <h1 className="mt-1.5 truncate font-serif text-xl font-black tracking-tight text-[var(--artist-text)]">
          {title}
        </h1>
      </div>
      {action}
    </header>
  )
}
