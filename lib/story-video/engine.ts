// ─────────────────────────────────────────────────────────────────────────────
// Engine do editor de vídeo de stories (estilo CapCut) — modelo de CAMADAS.
// Uma composição é uma lista de camadas (vídeo, imagem, texto), cada uma com
// posição no canvas, janela de tempo na timeline e animações de entrada/saída
// próprias. Compartilhada entre o preview (React) e o export (MediaRecorder +
// ffmpeg). Não importa fabric nem React — apenas Web APIs.
// ─────────────────────────────────────────────────────────────────────────────

export const EXPORT_W = 720
export const EXPORT_H = 1280
export const EXPORT_FPS = 30
export const ASPECT = EXPORT_W / EXPORT_H

// Duração das animações de entrada/saída (segundos).
export const ANIM_DUR = 0.6

export type AnimId = 'none' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | 'zoom-in' | 'zoom-out'

export const ANIMATIONS: { id: AnimId; label: string }[] = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'fade', label: 'Fade' },
  { id: 'slide-up', label: 'Deslizar ↑' },
  { id: 'slide-down', label: 'Deslizar ↓' },
  { id: 'slide-left', label: 'Deslizar ←' },
  { id: 'slide-right', label: 'Deslizar →' },
  { id: 'zoom-in', label: 'Zoom in' },
  { id: 'zoom-out', label: 'Zoom out' },
]

export type LayerKind = 'video' | 'image' | 'text'

// Descritor de uma camada da composição.
export interface LayerSpec {
  id: string
  kind: LayerKind
  // mídia (video/image)
  url?: string
  srcDuration?: number   // duração total da fonte de vídeo (s)
  trimStart?: number     // ponto de entrada dentro da fonte de vídeo (s)
  cover?: boolean        // true → preenche o quadro (fundo); false → caixa (overlay)
  // texto
  text?: string
  color?: string
  fontScale?: number     // tamanho da fonte como fração da altura do quadro
  // posição no canvas (centro normalizado 0..1)
  cx: number
  cy: number
  scale: number          // largura da caixa como fração da largura do quadro (overlay/texto)
  // janela de tempo na timeline (segundos)
  start: number
  duration: number
  // animações da própria camada
  inAnim: AnimId
  outAnim: AnimId
}

// Duração total da composição = fim da camada que termina mais tarde.
export function compositionDuration(layers: { start: number; duration: number }[]): number {
  return layers.reduce((max, l) => Math.max(max, l.start + l.duration), 0)
}

// Curva de suavização (easeOutCubic).
function ease(p: number): number {
  const x = Math.min(1, Math.max(0, p))
  return 1 - Math.pow(1 - x, 3)
}

export interface AnimTransform {
  alpha: number
  tx: number // deslocamento normalizado (-1..1) relativo à largura/altura
  ty: number
  scale: number
}

// Aplica a curva de uma animação a partir de um fator de progresso (0=oculto, 1=visível).
function animShape(id: AnimId, f: number): AnimTransform {
  const e = ease(f)
  const inv = 1 - e
  switch (id) {
    case 'fade':        return { alpha: e, tx: 0, ty: 0, scale: 1 }
    case 'slide-up':    return { alpha: e, tx: 0, ty: inv, scale: 1 }
    case 'slide-down':  return { alpha: e, tx: 0, ty: -inv, scale: 1 }
    case 'slide-left':  return { alpha: e, tx: inv, ty: 0, scale: 1 }
    case 'slide-right': return { alpha: e, tx: -inv, ty: 0, scale: 1 }
    case 'zoom-in':     return { alpha: e, tx: 0, ty: 0, scale: 0.7 + 0.3 * e }
    case 'zoom-out':    return { alpha: e, tx: 0, ty: 0, scale: 1.3 - 0.3 * e }
    default:            return { alpha: 1, tx: 0, ty: 0, scale: 1 }
  }
}

// Transform da camada em um tempo LOCAL (0 = início da camada, duration = fim).
export function computeLayerAnim(localT: number, duration: number, inAnim: AnimId, outAnim: AnimId): AnimTransform {
  const inDur  = Math.min(ANIM_DUR, duration / 2)
  const outDur = Math.min(ANIM_DUR, duration / 2)
  if (inAnim !== 'none' && localT < inDur) {
    return animShape(inAnim, localT / inDur)
  }
  if (outAnim !== 'none' && localT > duration - outDur) {
    return animShape(outAnim, (duration - localT) / outDur)
  }
  return { alpha: 1, tx: 0, ty: 0, scale: 1 }
}

// true se a camada está visível no instante `t` da timeline.
export function layerActiveAt(l: { start: number; duration: number }, t: number): boolean {
  return t >= l.start - 0.0001 && t <= l.start + l.duration + 0.0001
}

function naturalSize(media: HTMLVideoElement | HTMLImageElement): { w: number; h: number } {
  if ('videoWidth' in media) return { w: media.videoWidth || EXPORT_W, h: media.videoHeight || EXPORT_H }
  return { w: media.naturalWidth || EXPORT_W, h: media.naturalHeight || EXPORT_H }
}

// Quebra o texto em linhas que cabem em `maxW`.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ')
    let line = ''
    for (const word of words) {
      const test = line ? `${line} ${word}` : word
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line)
        line = word
      } else {
        line = test
      }
    }
    out.push(line)
  }
  return out
}

// Limpa o canvas com fundo preto (chamar uma vez por frame antes das camadas).
export function clearFrame(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)
}

// Desenha UMA camada no instante `t` da timeline. `media` é o elemento de mídia
// (vídeo/imagem) já carregado, ou null para texto.
export function drawLayer(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layer: LayerSpec,
  media: HTMLVideoElement | HTMLImageElement | null,
  t: number,
) {
  const localT = t - layer.start
  if (localT < -0.0001 || localT > layer.duration + 0.0001) return
  const anim = computeLayerAnim(localT, layer.duration, layer.inAnim, layer.outAnim)
  if (anim.alpha <= 0.001) return

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, anim.alpha))
  ctx.translate(layer.cx * W + anim.tx * W, layer.cy * H + anim.ty * H)
  ctx.scale(anim.scale, anim.scale)

  if (layer.kind === 'text') {
    const fontPx = Math.max(10, (layer.fontScale ?? 0.06) * H)
    ctx.font = `800 ${fontPx}px "Geist", system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const lines = wrapText(ctx, layer.text ?? '', layer.scale * W)
    const lh = fontPx * 1.2
    ctx.shadowColor = 'rgba(0,0,0,0.55)'
    ctx.shadowBlur = fontPx * 0.25
    ctx.shadowOffsetY = fontPx * 0.06
    ctx.fillStyle = layer.color ?? '#ffffff'
    lines.forEach((ln, i) => ctx.fillText(ln, 0, (i - (lines.length - 1) / 2) * lh))
  } else if (media) {
    const { w: mw, h: mh } = naturalSize(media)
    if (layer.cover) {
      // Preenche todo o quadro mantendo proporção (fundo).
      const s = Math.max(W / mw, H / mh)
      const dw = mw * s, dh = mh * s
      ctx.drawImage(media, -dw / 2, -dh / 2, dw, dh)
    } else {
      // Caixa de largura scale*W, altura pela proporção da mídia (overlay).
      const boxW = layer.scale * W
      const s = boxW / mw
      const dw = boxW, dh = mh * s
      ctx.drawImage(media, -dw / 2, -dh / 2, dw, dh)
    }
  }
  ctx.restore()
}

// Compõe um frame inteiro: fundo + todas as camadas ativas (ordem = z, back→front).
export function composeFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layers: LayerSpec[],
  mediaFor: (id: string) => HTMLVideoElement | HTMLImageElement | null,
  t: number,
) {
  clearFrame(ctx, W, H)
  for (const layer of layers) drawLayer(ctx, W, H, layer, mediaFor(layer.id), t)
}

// ─── Carregamento de mídia ────────────────────────────────────────────────────
export function loadVideo(url: string, muted: boolean): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video')
    v.src = url
    v.muted = muted
    v.playsInline = true
    v.preload = 'auto'
    v.crossOrigin = 'anonymous'
    const onReady = () => { cleanup(); resolve(v) }
    const onErr = () => { cleanup(); reject(new Error('Falha ao carregar vídeo')) }
    const cleanup = () => {
      v.removeEventListener('loadedmetadata', onReady)
      v.removeEventListener('error', onErr)
    }
    v.addEventListener('loadedmetadata', onReady, { once: true })
    v.addEventListener('error', onErr, { once: true })
  })
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Falha ao carregar imagem'))
    img.src = url
  })
}

// ─── Seleção de container de gravação ───────────────────────────────────────────
function pickMime(): { mime: string; isMp4: boolean } {
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
  ]
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      return { mime: m, isMp4: true }
    }
  }
  const webm = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const m of webm) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) {
      return { mime: m, isMp4: false }
    }
  }
  return { mime: '', isMp4: false }
}

export type ExportPhase = 'preparing' | 'recording' | 'transcoding'
export interface ExportProgress {
  phase: ExportPhase
  pct: number // 0..1 dentro da fase
}

// ─── Export principal (composição de camadas) ─────────────────────────────────
// Toca a composição em tempo real gravando o canvas + áudio dos vídeos; se o
// container não for MP4, transcodifica com ffmpeg.wasm. Retorna sempre um MP4.
export async function exportComposition(
  layers: LayerSpec[],
  onProgress: (p: ExportProgress) => void,
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  onProgress({ phase: 'preparing', pct: 0 })

  const total = compositionDuration(layers)
  if (total <= 0) throw new Error('Composição vazia.')

  // Carrega a mídia de cada camada (vídeos com áudio, isolados do preview).
  const media = new Map<string, HTMLVideoElement | HTMLImageElement>()
  const videoLayerIds: string[] = []
  let loaded = 0
  const mediaLayers = layers.filter((l) => l.kind !== 'text' && l.url)
  for (const l of mediaLayers) {
    if (l.kind === 'video') {
      const v = await loadVideo(l.url!, false)
      media.set(l.id, v)
      videoLayerIds.push(l.id)
    } else {
      const img = await loadImage(l.url!)
      media.set(l.id, img)
    }
    loaded++
    onProgress({ phase: 'preparing', pct: mediaLayers.length ? loaded / mediaLayers.length : 1 })
  }

  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_W
  canvas.height = EXPORT_H
  const ctx = canvas.getContext('2d')!

  // Grafo de áudio: mistura o áudio de todos os vídeos.
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ac = new AudioCtx()
  const audioDest = ac.createMediaStreamDestination()
  for (const id of videoLayerIds) {
    const v = media.get(id) as HTMLVideoElement
    try {
      const src = ac.createMediaElementSource(v)
      src.connect(audioDest)
    } catch {
      // vídeo sem faixa de áudio — segue sem
    }
  }

  const canvasStream = canvas.captureStream(EXPORT_FPS)
  const tracks = [...canvasStream.getVideoTracks(), ...audioDest.stream.getAudioTracks()]
  const stream = new MediaStream(tracks)

  const { mime, isMp4 } = pickMime()
  if (typeof MediaRecorder === 'undefined' || !mime) {
    throw new Error('Seu navegador não suporta gravação de vídeo (MediaRecorder).')
  }

  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
  const stopped = new Promise<void>((res) => { rec.onstop = () => res() })

  await ac.resume().catch(() => {})
  rec.start(100)
  onProgress({ phase: 'recording', pct: 0 })

  const mediaFor = (id: string) => media.get(id) ?? null

  // Reprodução em tempo real guiada pelo relógio de parede.
  await new Promise<void>((resolve) => {
    const startWall = performance.now()
    const activated = new Set<string>()

    const step = () => {
      const t = (performance.now() - startWall) / 1000
      if (t >= total) {
        clearFrame(ctx, EXPORT_W, EXPORT_H)
        resolve()
        return
      }
      // Sincroniza os vídeos: ativa/pausa conforme a janela de tempo da camada.
      for (const l of layers) {
        if (l.kind !== 'video') continue
        const v = media.get(l.id) as HTMLVideoElement | undefined
        if (!v) continue
        if (layerActiveAt(l, t)) {
          if (!activated.has(l.id)) {
            activated.add(l.id)
            v.currentTime = (l.trimStart ?? 0) + (t - l.start)
            v.play().catch(() => {})
          }
        } else if (activated.has(l.id)) {
          activated.delete(l.id)
          v.pause()
        }
      }
      composeFrame(ctx, EXPORT_W, EXPORT_H, layers, mediaFor, t)
      onProgress({ phase: 'recording', pct: t / total })
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })

  for (const id of videoLayerIds) (media.get(id) as HTMLVideoElement).pause()
  rec.stop()
  await stopped
  ac.close().catch(() => {})

  let blob = new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' })
  if (isMp4) return { blob, ext: 'mp4' }

  // Transcodifica WebM → MP4 com ffmpeg.wasm (compatibilidade iOS/Safari).
  onProgress({ phase: 'transcoding', pct: 0 })
  blob = await transcodeToMp4(blob, (p) => onProgress({ phase: 'transcoding', pct: p }))
  return { blob, ext: 'mp4' }
}

// ─── Transcodificação WebM → MP4 (ffmpeg.wasm, single-thread) ──────────────────
let ffmpegSingleton: import('@ffmpeg/ffmpeg').FFmpeg | null = null

async function getFfmpeg() {
  if (ffmpegSingleton) return ffmpegSingleton
  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { toBlobURL } = await import('@ffmpeg/util')
  const ff = new FFmpeg()
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd'
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  ffmpegSingleton = ff
  return ff
}

async function transcodeToMp4(webm: Blob, onProgress: (p: number) => void): Promise<Blob> {
  const { fetchFile } = await import('@ffmpeg/util')
  const ff = await getFfmpeg()
  ff.on('progress', ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))))
  await ff.writeFile('in.webm', await fetchFile(webm))
  await ff.exec([
    '-i', 'in.webm',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    'out.mp4',
  ])
  const data = await ff.readFile('out.mp4')
  const uint8 = data as Uint8Array
  return new Blob([uint8.buffer as ArrayBuffer], { type: 'video/mp4' })
}
