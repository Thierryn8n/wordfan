import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Logo({ className, href = '/home' }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn('inline-flex items-baseline gap-0.5 font-serif font-bold tracking-tight', className)}>
      <span className="text-foreground">Word</span>
      <span className="text-gradient-brand">Fan</span>
    </Link>
  )
}
