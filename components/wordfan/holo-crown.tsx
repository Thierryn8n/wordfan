import { Crown } from 'lucide-react'

/**
 * Coroa holográfica 3D girando. Usada para marcar contratantes Enterprise
 * aprovados em todas as telas de perfil. Respeita prefers-reduced-motion
 * via a classe .crown-3d (definida em globals.css).
 */
export function HoloCrown({
  size = 20,
  className = '',
  label = 'Contratante Enterprise',
}: {
  size?: number
  className?: string
  label?: string
}) {
  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      style={{ perspective: 600 }}
      role="img"
      aria-label={label}
      title={label}
    >
      <span className="crown-3d inline-flex">
        <Crown
          size={size}
          strokeWidth={2.25}
          className="holo-check"
          style={{
            stroke: 'url(#holo-crown-gradient)',
            fill: 'url(#holo-crown-gradient)',
            fillOpacity: 0.25,
          }}
          aria-hidden="true"
        />
      </span>
      {/* Gradiente holográfico compartilhado para o traço/preenchimento da coroa */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="holo-crown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7df9ff" />
            <stop offset="30%" stopColor="#a78bfa" />
            <stop offset="55%" stopColor="#f472b6" />
            <stop offset="80%" stopColor="#fde68a" />
            <stop offset="100%" stopColor="#6ee7b7" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  )
}
