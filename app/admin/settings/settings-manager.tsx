'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { CheckCircle2, Upload, X } from 'lucide-react'
import { uploadSiteLogo, saveSiteSettings } from './actions'

export function SettingsManager() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleFile(file: File) {
    setError(null)
    setSuccess(false)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadSiteLogo(fd)

      if (res.error) setError(res.error)
      else if (res.url) {
        setLogoUrl(res.url)
        setSuccess(true)
      }
    } catch {
      setError('Não foi possível enviar a imagem. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  function saveSettings() {
    setError(null)
    startTransition(async () => {
      const res = await saveSiteSettings({ logoUrl })
      if (res.error) setError(res.error)
      else setSuccess(true)
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-[10px] font-black tracking-[0.25em] text-muted-foreground">
          LOGO DA PLATAFORMA
        </h2>
        <div className="mt-4 flex items-center gap-6">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo da plataforma"
                fill
                sizes="96px"
                className="object-contain p-4"
              />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 text-[8px] font-black tracking-[0.12em] text-zinc-600">
                SEM LOGO
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="URL do logo ou envie um arquivo"
              aria-label="URL do logo"
              className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 text-[9px] font-black tracking-[0.15em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              <Upload className="size-3.5" aria-hidden="true" />
              {uploading ? 'ENVIANDO...' : 'ENVIAR ARQUIVO'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="sr-only"
              aria-label="Enviar arquivo do logo"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-xs font-bold text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            Logo salvo com sucesso!
          </p>
        )}
      </section>

      <div>
        <button
          type="button"
          onClick={saveSettings}
          disabled={isPending}
          className="gradient-brand h-13 w-full rounded-2xl py-4 text-[11px] font-black tracking-[0.25em] text-white disabled:opacity-60"
        >
          {isPending ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
        </button>
      </div>
    </div>
  )
}
