import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TIER_LABELS, type Tier } from '@/lib/types'

const tierStyles: Record<Tier, string> = {
  bronze: 'bg-[#8c5a2b]/20 text-[#d99e6a] border-[#8c5a2b]/40',
  silver: 'bg-[#9aa4b2]/15 text-[#c3ccd9] border-[#9aa4b2]/35',
  gold: 'bg-accent/15 text-accent border-accent/35',
  platinum: 'bg-primary/15 text-primary border-primary/35',
}

const tierIconColor: Record<Tier, string> = {
  bronze: 'text-[#d99e6a]',
  silver: 'text-[#c3ccd9]',
  gold: 'text-accent',
  platinum: 'text-primary',
}

// Aceita o Tier tipado ou uma string livre vinda do banco (RPC de selos).
function normalizeTier(tier: Tier | string | null | undefined): Tier | null {
  if (tier && tier in tierStyles) return tier as Tier
  return null
}

export function TierBadge({
  tier,
  className,
}: {
  tier: Tier
  className?: string
}) {
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

// Selo compacto (ícone) para exibir ao lado do nome do usuário em comentários,
// feed e cabeçalho do perfil. Não renderiza nada se o usuário não for assinante.
export function TierBadgeIcon({
  tier,
  size = 'sm',
  className,
}: {
  tier: Tier | string | null | undefined
  size?: 'sm' | 'md'
  className?: string
}) {
  const t = normalizeTier(tier)
  if (!t) return null
  const iconSize = size === 'md' ? 'size-4' : 'size-3.5'
  return (
    <span
      className={cn('inline-flex shrink-0 align-middle', tierIconColor[t], className)}
      title={`Assinante ${TIER_LABELS[t]}`}
    >
      <BadgeCheck className={iconSize} aria-hidden="true" />
      <span className="sr-only">{`Assinante ${TIER_LABELS[t]}`}</span>
    </span>
  )
}
