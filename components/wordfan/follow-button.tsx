'use client'

import { useState } from 'react'
import { UserCheck, UserPlus } from 'lucide-react'

export function FollowButton({
  initialFollowing = false,
}: {
  initialFollowing?: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)

  return (
    <button
      type="button"
      aria-pressed={following}
      onClick={() => setFollowing((f) => !f)}
      className={
        following
          ? 'flex h-14 items-center gap-2 rounded-2xl border border-club/50 bg-club/10 px-5 text-[11px] font-extrabold tracking-[0.2em] text-club transition-transform active:scale-[0.98]'
          : 'surface elev-1 flex h-14 items-center gap-2 rounded-2xl px-5 text-[11px] font-extrabold tracking-[0.2em] transition-transform active:scale-[0.98]'
      }
    >
      {following ? (
        <UserCheck className="size-4" aria-hidden="true" />
      ) : (
        <UserPlus className="size-4" aria-hidden="true" />
      )}
      {following ? 'SEGUINDO' : 'SEGUIR'}
    </button>
  )
}
