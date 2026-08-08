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
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[9px] font-black tracking-[0.3em] text-[var(--artist-primary)]">
          {eyebrow}
        </p>
        <h1 className="mt-1 truncate font-serif text-2xl font-black tracking-tight text-[var(--artist-text)]">
          {title}
        </h1>
      </div>
      {action}
    </header>
  )
}
