import { NextResponse } from 'next/server'

// Busca GIFs na GIPHY. Quando não há termo, retorna os trending.
export async function GET(request: Request) {
  const apiKey = process.env.GIPHY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'GIPHY_API_KEY não configurada' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  const limit = 24

  const base = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=${limit}&rating=pg-13&lang=pt`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=${limit}&rating=pg-13`

  try {
    const res = await fetch(base, { next: { revalidate: 300 } })
    if (!res.ok) {
      return NextResponse.json({ error: 'Falha ao consultar a GIPHY' }, { status: 502 })
    }
    const json = await res.json()
    const gifs = (json.data ?? []).map((g: any) => ({
      id: g.id as string,
      preview: g.images?.fixed_width_small?.url ?? g.images?.fixed_width?.url,
      full: g.images?.fixed_width?.url ?? g.images?.original?.url,
      title: (g.title as string) || 'GIF',
    }))
    return NextResponse.json({ gifs })
  } catch {
    return NextResponse.json({ error: 'Erro de rede ao consultar a GIPHY' }, { status: 502 })
  }
}
