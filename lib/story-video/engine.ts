// ─────────────────────────────────────────────────────────────────────────────
// Engine do editor de vídeo de stories (estilo CapCut).
// Compartilhada entre o preview (React) e o export (MediaRecorder + ffmpeg).
// Não importa fabric nem React — apenas Web APIs.
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

// Descritor de um clipe na timeline (fonte + pontos de corte).
export interface ClipSpec {
  id: string
  url: string
  duration: number   // duração total da fonte (s)
  trimStart: number  // ponto de entrada dentro da fonte (s)
  trimEnd: number    // ponto de saída dentro da fonte (s)
}

export interface StorySettings {
  inAnim: AnimId
  outAnim: AnimId
}

// Duração aparada de um clipe.
export function clipLen(c: { trimStart: number; trimEnd: number }): number {
  return Math.max(0, c.trimEnd - c.trimStart)
}

// Posição de cada clipe na linha do tempo (sequencial numa única trilha).
export function layoutClips<T extends { trimStart: number; trimEnd: number }>(
  clips: T[],
): { start: number; end: number }[] {
  let acc = 0
  return clips.map((c) => {
    const start = acc
    acc += clipLen(c)
    return { start, end: acc }
  })
}

export function totalDuration(clips: { trimStart: number; trimEnd: number }[]): number {
  return clips.reduce((sum, c) => sum + clipLen(c), 0)
}

// Índice do clipe ativo em um instante `t` da timeline.
export function activeIndexAt(layout: { start: number; end: number }[], t: number): number {
  for (let i = 0; i < layout.length; i++) {
    if (t >= layout[i].start && t < layout[i].end) return i
  }
  return layout.length - 1
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

// Transform combinado (entrada no início, saída no fim) para o instante `t`.
export function computeAnimation(t: number, total: number, s: StorySettings): AnimTransform {
  let tf: AnimTransform = { alpha: 1, tx: 0, ty: 0, scale: 1 }
  if (s.inAnim !== 'none' && t < ANIM_DUR) {
    tf = animShape(s.inAnim, t / ANIM_DUR)
  } else if (s.outAnim !== 'none' && t > total - ANIM_DUR) {
    tf = animShape(s.outAnim, (total - t) / ANIM_DUR)
  }
  return tf
}

// Desenha um frame do vídeo no canvas com "cover fit" + a transform da animação.
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  video: HTMLVideoElement,
  anim: AnimTransform,
) {
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, W, H)

  const vw = video.videoWidth || W
  const vh = video.videoHeight || H
  if (!vw || !vh) return

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, anim.alpha))
  // Origem no centro para escala e deslocamento.
  ctx.translate(W / 2 + anim.tx * W, H / 2 + anim.ty * H)
  ctx.scale(anim.scale, anim.scale)

  const scale = Math.max(W / vw, H / vh)
  const dw = vw * scale
  const dh = vh * scale
  ctx.drawImage(video, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

// ─── Carregamento de vídeo ────────────────────────────────────────────────────
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

// ─── Export principal ────────────────────────────────────────────────────────
// Toca a timeline em tempo real gravando o canvas + áudio; se o container não for
// MP4, transcodifica com ffmpeg.wasm. Retorna sempre um MP4.
export async function exportTimeline(
  clips: ClipSpec[],
  settings: StorySettings,
  onProgress: (p: ExportProgress) => void,
): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  onProgress({ phase: 'preparing', pct: 0 })

  const layout = layoutClips(clips)
  const total = totalDuration(clips)
  if (total <= 0) throw new Error('Timeline vazia.')

  // Vídeos próprios do export (com áudio), isolados do preview.
  const videos = await Promise.all(clips.map((c) => loadVideo(c.url, false)))
  onProgress({ phase: 'preparing', pct: 0.5 })

  const canvas = document.createElement('canvas')
  canvas.width = EXPORT_W
  canvas.height = EXPORT_H
  const ctx = canvas.getContext('2d')!

  // Grafo de áudio: mistura o áudio de todos os clipes num destino de stream.
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ac = new AudioCtx()
  const audioDest = ac.createMediaStreamDestination()
  for (const v of videos) {
    try {
      const src = ac.createMediaElementSource(v)
      src.connect(audioDest)
    } catch {
      // alguns vídeos sem faixa de áudio podem falhar aqui — seguimos sem áudio deles
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

  // Reprodução em tempo real guiada pelo relógio.
  await new Promise<void>((resolve) => {
    let curIdx = -1
    const startWall = performance.now()

    const step = () => {
      const t = (performance.now() - startWall) / 1000
      if (t >= total) {
        drawFrame(ctx, EXPORT_W, EXPORT_H, videos[videos.length - 1], { alpha: 0, tx: 0, ty: 0, scale: 1 })
        resolve()
        return
      }
      const idx = activeIndexAt(layout, t)
      if (idx !== curIdx) {
        if (curIdx >= 0) videos[curIdx].pause()
        curIdx = idx
        const v = videos[idx]
        v.currentTime = clips[idx].trimStart
        v.play().catch(() => {})
      }
      const anim = computeAnimation(t, total, settings)
      drawFrame(ctx, EXPORT_W, EXPORT_H, videos[idx], anim)
      onProgress({ phase: 'recording', pct: t / total })
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })

  videos.forEach((v) => v.pause())
  rec.stop()
  await stopped
  ac.close().catch(() => {})

  let blob = new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' })

  if (isMp4) {
    return { blob, ext: 'mp4' }
  }

  // Transcodifica WebM → MP4 com ffmpeg.wasm (garante compatibilidade iOS/Safari).
  onProgress({ phase: 'transcoding', pct: 0 })
  const mp4 = await transcodeToMp4(blob, (p) => onProgress({ phase: 'transcoding', pct: p }))
  blob = mp4
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
  // H.264 + AAC, faststart para streaming/preview imediato.
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
