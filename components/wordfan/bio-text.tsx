'use client'

import { useState } from 'react'

export function BioText({ bio }: { bio: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="mt-2 max-w-xs">
      <p className={`text-sm leading-relaxed text-foreground/80 ${isExpanded ? '' : 'line-clamp-2'}`}>
        {bio}
      </p>
      {bio.length > 100 && (
        <span 
          className="mt-1 text-xs font-bold tracking-[0.1em] text-club hover:text-club/80 transition-colors cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'LER MENOS' : 'LER MAIS'}
        </span>
      )}
    </div>
  )
}
