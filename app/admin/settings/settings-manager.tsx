'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { CheckCircle2, Upload, X } from 'lucide-react'
import { uploadSiteLogo, uploadSiteFavicon, saveSiteSettings } from './actions'

export function SettingsManager({
  initialLogoUrl = '',
  initialFaviconUrl = '',
  initialSiteName = '',
  initialSiteDescription = '',
}: {
  initialLogoUrl?: string
  initialFaviconUrl?: string
  initialSiteName?: string
  initialSiteDescription?: string
}) {
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [faviconUrl, setFaviconUrl] = useState(initialFaviconUrl)
  const [siteName, setSiteName] = useState(initialSiteName)
  const [siteDescription, setSiteDescription] = useState(initialSiteDescription)
  const [uploading, setUploading] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleLogoFile(file: File) {
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

  async function handleFaviconFile(file: File) {
    setError(null)
    setSuccess(false)
    setUploadingFavicon(true)

    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadSiteFavicon(fd)

      if (res.error) setError(res.error)
      else if (res.url) {
        setFaviconUrl(res.url)
        setSuccess(true)
      }
    } catch {
      setError('Não foi possível enviar a imagem. Tente novamente.')
    } finally {
      setUploadingFavicon(false)
    }
  }

  function saveSettings() {
    setError(null)
    startTransition(async () => {
      const res = await saveSiteSettings({ 
        logoUrl, 
        faviconUrl,
        siteName,
        siteDescription
      })
      if (res.error) setError(res.error)
      else setSuccess(true)
    })
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Identidade Visual */}
      <section>
        <h2 className="text-[10px] font-black tracking-[0.25em] text-muted-foreground mb-4">
          IDENTIDADE VISUAL
        </h2>
        
        {/* Logo */}
        <div className="mb-6">
          <label className="text-[9px] font-black tracking-[0.15em] text-zinc-500 mb-2 block">
            LOGO DA PLATAFORMA
          </label>
          <div className="flex items-center gap-6">
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
                onClick={() => logoInputRef.current?.click()}
                disabled={uploading}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 text-[9px] font-black tracking-[0.15em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                {uploading ? 'ENVIANDO...' : 'ENVIAR LOGO'}
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                className="sr-only"
                aria-label="Enviar arquivo do logo"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleLogoFile(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>

        {/* Favicon */}
        <div>
          <label className="text-[9px] font-black tracking-[0.15em] text-zinc-500 mb-2 block">
            FAVICON (ÍCONE DO SITE)
          </label>
          <div className="flex items-center gap-6">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
              {faviconUrl ? (
                <Image
                  src={faviconUrl}
                  alt="Favicon"
                  fill
                  sizes="64px"
                  className="object-contain p-2"
                />
              ) : (
                <span className="flex h-full flex-col items-center justify-center gap-2 text-[8px] font-black tracking-[0.12em] text-zinc-600">
                  SEM
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <input
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="URL do favicon ou envie um arquivo"
                aria-label="URL do favicon"
                className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => faviconInputRef.current?.click()}
                disabled={uploadingFavicon}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 text-[9px] font-black tracking-[0.15em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                {uploadingFavicon ? 'ENVIANDO...' : 'ENVIAR FAVICON'}
              </button>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                aria-label="Enviar arquivo do favicon"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFaviconFile(f)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Informações do Site */}
      <section>
        <h2 className="text-[10px] font-black tracking-[0.25em] text-muted-foreground mb-4">
          INFORMAÇÕES DO SITE
        </h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">NOME DO SITE</span>
            <input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="WordFan"
              className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black tracking-[0.15em] text-zinc-500">DESCRIÇÃO DO SITE</span>
            <textarea
              value={siteDescription}
              onChange={(e) => setSiteDescription(e.target.value)}
              placeholder="A plataforma de fan clubs que aproxima fãs e artistas..."
              rows={3}
              className="rounded-xl border border-white/10 bg-card px-4 py-3 text-xs font-bold outline-none focus:border-primary resize-none"
            />
          </label>
        </div>
      </section>

      {/* Mensagens de erro/sucesso */}
      {error && (
        <p role="alert" className="text-xs font-bold text-destructive">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Configurações salvas com sucesso!
        </p>
      )}

      {/* Botão Salvar */}
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
