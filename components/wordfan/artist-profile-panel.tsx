'use client'

import { useState } from 'react'
import { ProfileEditor } from '@/app/admin/studio/profile-editor'
import { CredentialsCard } from '@/components/wordfan/credentials-card'
import type { Artist } from '@/lib/types'

export function ArtistProfilePanel({
  artist,
  currentEmail,
  showCredentials,
}: {
  artist: Artist
  currentEmail: string
  showCredentials: boolean
}) {
  const [avatarUrl, setAvatarUrl] = useState(artist.avatar_url ?? '')
  const [bannerUrl, setBannerUrl] = useState(artist.banner_url ?? '')
  const [logoUrl, setLogoUrl] = useState(artist.logo_url ?? '')

  return (
    <div className="flex flex-col gap-5">
      <ProfileEditor
        artist={artist}
        avatarUrl={avatarUrl}
        bannerUrl={bannerUrl}
        logoUrl={logoUrl}
        onAvatarChange={setAvatarUrl}
        onBannerChange={setBannerUrl}
        onLogoChange={setLogoUrl}
      />
      {showCredentials && <CredentialsCard currentEmail={currentEmail} />}
    </div>
  )
}
