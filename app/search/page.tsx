import { getArtists } from '@/lib/data'
import { BottomNav } from '@/components/wordfan/bottom-nav'
import { SearchClient } from './search-client'

export const metadata = { title: 'Pesquisar — WordFan' }

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; q?: string }>
}) {
  const { g, q } = await searchParams
  const artists = await getArtists()
  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background pb-32">
      <SearchClient artists={artists} initialGenre={g ?? null} initialQuery={q ?? ''} />
      <BottomNav />
    </div>
  )
}
