'use client'

// Player da transmissão. Aceita YouTube, Vimeo ou arquivo de vídeo direto
// (MP4/HLS). Detecta o tipo pela URL e renderiza o embed adequado.

function toEmbed(url: string): { kind: 'iframe' | 'video'; src: string } | null {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')

    // YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id = u.searchParams.get('v')
      if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` }
      if (u.pathname.startsWith('/live/')) {
        return { kind: 'iframe', src: `https://www.youtube.com/embed/${u.pathname.split('/')[2]}?autoplay=1&rel=0` }
      }
      if (u.pathname.startsWith('/embed/')) return { kind: 'iframe', src: url }
    }
    if (host === 'youtu.be') {
      return { kind: 'iframe', src: `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1&rel=0` }
    }

    // Vimeo
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}?autoplay=1` }
    }
    if (host === 'player.vimeo.com') return { kind: 'iframe', src: url }

    // Arquivo de vídeo direto
    if (/\.(mp4|webm|mov|m3u8)$/i.test(u.pathname)) return { kind: 'video', src: url }

    // Fallback: tenta como iframe genérico
    return { kind: 'iframe', src: url }
  } catch {
    return null
  }
}

export function LivePlayer({ streamUrl, poster }: { streamUrl: string; poster?: string | null }) {
  const embed = toEmbed(streamUrl)
  if (!embed) return null

  if (embed.kind === 'video') {
    return (
      <video
        src={embed.src}
        poster={poster ?? undefined}
        controls
        autoPlay
        playsInline
        className="absolute inset-0 h-full w-full bg-black object-contain"
      />
    )
  }

  return (
    <iframe
      src={embed.src}
      title="Transmissão ao vivo"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      className="absolute inset-0 h-full w-full border-0"
    />
  )
}
