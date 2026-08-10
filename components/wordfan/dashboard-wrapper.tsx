'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export function DashboardWrapper({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const artistSlug = searchParams.get('artist') || undefined
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  if (!isReady) return null

  return <>{children}</>
}
