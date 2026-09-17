'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { Building2, CheckCircle2, ImagePlus, Upload } from 'lucide-react'
import type { CompanySettings } from '@/lib/types'
import { saveCompanySettings, uploadCompanyLogo } from './actions'

function Field({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-[11px] font-bold tracking-[0.04em] text-zinc-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 rounded-xl border border-white/10 bg-card px-4 text-xs font-bold outline-none focus:border-primary"
      />
    </label>
  )
}

export function CompanyForm({ initial }: { initial: CompanySettings | null }) {
  const [legalName, setLegalName] = useState(initial?.legal_name ?? '')
  const [tradeName, setTradeName] = useState(initial?.trade_name ?? '')
  const [cnpj, setCnpj] = useState(initial?.cnpj ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [state, setState] = useState(initial?.state ?? '')
  const [zip, setZip] = useState(initial?.zip ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ ok?: string; error?: string }>({})
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setStatus({})
    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', file)
      const res = await uploadCompanyLogo(fd)
      if (res.error) setStatus({ error: res.error })
      else if (res.url) setLogoUrl(res.url)
    } catch {
      setStatus({ error: 'Falha ao enviar a logo.' })
    } finally {
      setUploading(false)
    }
  }

  function save() {
    setStatus({})
    startTransition(async () => {
      const res = await saveCompanySettings({
        legalName, tradeName, cnpj, address, city, state, zip, email, phone, logoUrl,
      })
      if (res?.error) setStatus({ error: res.error })
      else setStatus({ ok: 'Dados da empresa salvos.' })
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="admin-panel p-6">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" aria-hidden="true" />
          <h2 className="admin-eyebrow">LOGO DA EMPRESA</h2>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {logoUrl ? (
              <Image src={logoUrl || '/placeholder.svg'} alt="Logo da empresa" fill sizes="96px" className="object-contain p-2" />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-2 text-[11px] font-bold text-zinc-500">
                <ImagePlus className="size-5" aria-hidden="true" />
                Sem logo
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="URL da logo ou envie um arquivo"
              aria-label="URL da logo da empresa"
              className="h-10 rounded-xl border border-white/10 bg-card px-3 text-xs font-medium outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 text-[11px] font-black tracking-[0.06em] text-primary transition-colors hover:bg-primary/15 disabled:opacity-50"
            >
              <Upload className="size-3.5" aria-hidden="true" />
              {uploading ? 'Enviando…' : 'Enviar arquivo'}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="sr-only"
              aria-label="Enviar logo da empresa"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>
      </section>

      <section className="admin-panel p-6">
        <h2 className="admin-eyebrow">DADOS CADASTRAIS</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="RAZÃO SOCIAL" value={legalName} onChange={setLegalName} placeholder="Empresa LTDA" />
          <Field label="NOME FANTASIA" value={tradeName} onChange={setTradeName} placeholder="WordFan" />
          <Field label="CNPJ" value={cnpj} onChange={setCnpj} placeholder="00.000.000/0001-00" />
          <Field label="E-MAIL" value={email} onChange={setEmail} placeholder="contato@empresa.com" />
          <Field label="TELEFONE" value={phone} onChange={setPhone} placeholder="(11) 90000-0000" />
          <Field label="CEP" value={zip} onChange={setZip} placeholder="00000-000" />
          <Field label="ENDEREÇO" value={address} onChange={setAddress} placeholder="Rua, número, bairro" className="sm:col-span-2" />
          <Field label="CIDADE" value={city} onChange={setCity} placeholder="São Paulo" />
          <Field label="ESTADO (UF)" value={state} onChange={setState} placeholder="SP" />
        </div>
      </section>

      <div>
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="gradient-brand flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-[11px] font-black tracking-[0.2em] text-white shadow-[0_12px_30px_-16px_rgba(255,106,0,0.8)] disabled:opacity-60"
        >
          {isPending ? 'SALVANDO…' : 'SALVAR DADOS DA EMPRESA'}
        </button>
        {status.error && (
          <p role="alert" className="mt-3 text-center text-xs font-bold text-destructive">
            {status.error}
          </p>
        )}
        {status.ok && (
          <p role="status" className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-primary">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {status.ok}
          </p>
        )}
      </div>
    </div>
  )
}
