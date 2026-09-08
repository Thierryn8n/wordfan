import { getArtists, getUpcomingShows, getActiveAds } from '@/lib/data'
import { AdBanner } from '@/components/wordfan/ad-banner'
import { SearchClient } from './search-client'

export const metadata = { title: 'Pesquisar — WordFan' }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; q?: string }>
}) {
  const [{ g, q }, artists, shows, ads] = await Promise.all([
    searchParams,
    getArtists(),
    getUpcomingShows(40),
    getActiveAds('discover'),
  ])

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-40">
      <SearchClient
        artists={artists}
        shows={shows}
        initialGenre={g ?? null}
        initialQuery={q ?? ''}
        adSlot={ads.length > 0 ? <AdBanner ad={ads[0]} variant="inline" /> : null}
      />
    </div>
  )
}
