import { cn } from '@/lib/utils'
import { TIER_LABELS, type Tier } from '@/lib/types'

const tierStyles: Record<Tier, string> = {
  bronze: 'bg-[#8c5a2b]/20 text-[#d99e6a] border-[#8c5a2b]/40',
  silver: 'bg-[#9aa4b2]/15 text-[#c3ccd9] border-[#9aa4b2]/35',
  gold: 'bg-accent/15 text-accent border-accent/35',
  platinum: 'bg-primary/15 text-primary border-primary/35',
}

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        tierStyles[tier],
        className,
      )}
    >
      {TIER_LABELS[tier]}
    </span>
  )
}
