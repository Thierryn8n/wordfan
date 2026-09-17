/**
 * Extração de identidade visual (paleta) a partir das imagens do artista
 * — logo, banner e foto de perfil — 100% no cliente, via <canvas>.
 *
 * Não usa dependências externas: baixa cada imagem (crossOrigin anônimo),
 * reduz para uma grade pequena, agrupa as cores por "bucket" e escolhe as
 * dominantes com maior saturação/relevância. A partir da cor primária deriva
 * secundária, gradiente e um fundo escuro com texto de contraste adequado.
 */

import { DEFAULT_THEME, type ArtistTheme } from '@/lib/artist-theme'

interface RGB {
  r: number
  g: number
  b: number
}

function clamp(n: number, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function toHex({ r, g, b }: RGB): string {
  return '#' + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  const d = max - min
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0)
        break
      case gn:
        h = (bn - rn) / d + 2
        break
      default:
        h = (rn - gn) / d + 4
    }
    h /= 6
  }
  return { h: h * 360, s, l }
}

function hslToRgb(h: number, s: number, l: number): RGB {
  h /= 360
  let r: number
  let g: number
  let b: number
  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return { r: r * 255, g: g * 255, b: b * 255 }
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) return resolve(null)
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Amostra as cores de uma imagem e devolve buckets ponderados por relevância. */
function sampleImage(img: HTMLImageElement, weight: number, acc: Map<string, { count: number; rgb: RGB }>) {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return
  ctx.drawImage(img, 0, 0, size, size)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, size, size).data
  } catch {
    // canvas "tainted" (CORS) — ignora esta imagem
    return
  }
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = data[i + 3]
    if (a < 125) continue
    const { s, l } = rgbToHsl({ r, g, b })
    // Descarta quase-preto, quase-branco e cinzas sem cor.
    if (l < 0.08 || l > 0.94) continue
    if (s < 0.12) continue
    // Quantiza em blocos de 24 para agrupar tons parecidos.
    const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`
    const prev = acc.get(key)
    // Peso extra para cores mais saturadas — puxa a identidade real.
    const w = weight * (1 + s)
    if (prev) {
      prev.count += w
    } else {
      acc.set(key, { count: w, rgb: { r, g, b } })
    }
  }
}

/** Garante contraste mínimo do texto sobre um fundo escuro. */
function relLum({ r, g, b }: RGB): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export interface ExtractedPalette {
  theme: ArtistTheme
  /** Cores dominantes encontradas (para exibir os swatches). */
  swatches: string[]
}

/**
 * Extrai a paleta a partir das três imagens. Retorna null se nenhuma cor
 * utilizável for encontrada (ex.: imagens ausentes ou bloqueadas por CORS).
 */
export async function extractPalette(input: {
  logoUrl?: string
  bannerUrl?: string
  avatarUrl?: string
}): Promise<ExtractedPalette | null> {
  const [logo, banner, avatar] = await Promise.all([
    loadImage(input.logoUrl ?? ''),
    loadImage(input.bannerUrl ?? ''),
    loadImage(input.avatarUrl ?? ''),
  ])

  const acc = new Map<string, { count: number; rgb: RGB }>()
  // A logo carrega mais peso na identidade da marca, depois avatar e banner.
  if (logo) sampleImage(logo, 3, acc)
  if (avatar) sampleImage(avatar, 2, acc)
  if (banner) sampleImage(banner, 1.4, acc)

  if (acc.size === 0) return null

  const ranked = [...acc.values()].sort((a, b) => b.count - a.count)
  const primaryRgb = ranked[0].rgb

  // Secundária: a cor dominante seguinte com matiz suficientemente diferente.
  const primaryHsl = rgbToHsl(primaryRgb)
  let secondaryRgb = ranked[1]?.rgb ?? primaryRgb
  for (const cand of ranked.slice(1, 8)) {
    const h = rgbToHsl(cand.rgb).h
    const diff = Math.min(Math.abs(h - primaryHsl.h), 360 - Math.abs(h - primaryHsl.h))
    if (diff > 25) {
      secondaryRgb = cand.rgb
      break
    }
  }

  // Normaliza a primária para um tom vibrante e legível como cor de destaque.
  const pAdj = hslToRgb(primaryHsl.h, Math.max(0.55, Math.min(0.95, primaryHsl.s)), Math.min(0.62, Math.max(0.48, primaryHsl.l)))
  const primary = toHex(pAdj)

  const sHsl = rgbToHsl(secondaryRgb)
  const secondary = toHex(hslToRgb(sHsl.h, Math.max(0.5, Math.min(0.9, sHsl.s)), Math.min(0.6, Math.max(0.46, sHsl.l))))

  // Gradiente: variações de luminosidade em torno da primária.
  const gradFrom = toHex(hslToRgb(primaryHsl.h, Math.min(0.95, primaryHsl.s + 0.05), 0.58))
  const gradVia = primary
  const gradTo = toHex(hslToRgb((primaryHsl.h + 12) % 360, Math.min(0.95, primaryHsl.s + 0.05), 0.46))

  // Fundo escuro com leve tingimento do matiz da marca.
  const bg = toHex(hslToRgb(primaryHsl.h, 0.22, 0.045))
  const surface = toHex(hslToRgb(primaryHsl.h, 0.18, 0.1))
  const text = '#FFFFFF'
  const muted = toHex(hslToRgb(primaryHsl.h, 0.1, 0.66))

  const theme: ArtistTheme = {
    ...DEFAULT_THEME,
    primary,
    secondary,
    bg,
    surface,
    text: relLum(pAdj) > 0.5 ? text : text,
    muted,
    gradient: { from: gradFrom, via: gradVia, to: gradTo },
  }

  const swatches = ranked.slice(0, 5).map((r) => toHex(r.rgb))

  return { theme, swatches }
}
