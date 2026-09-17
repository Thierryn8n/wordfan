'use client'

import { useState } from 'react'
import { Check, Loader2, MapPin, X } from 'lucide-react'
import type { Show } from '@/lib/types'

function formatCep(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

type CepStatus = 'idle' | 'loading' | 'ok' | 'error'

/**
 * Bloco de endereço do show com validação de CEP via ViaCEP (gratuito, sem chave).
 * Ao digitar um CEP válido (8 dígitos) preenche automaticamente rua, cidade e UF —
 * garantindo endereços completos e roteáveis pelo Google Maps.
 *
 * Os inputs são controlados mas mantêm o atributo `name`, então continuam sendo
 * enviados normalmente no FormData da server action `saveShow`.
 */
export function ShowAddressFields({ editing }: { editing: Show | null }) {
  const [venue, setVenue] = useState(editing?.venue ?? '')
  const [cep, setCep] = useState(editing?.cep ?? '')
  const [address, setAddress] = useState(editing?.address ?? '')
  const [city, setCity] = useState(editing?.city ?? '')
  const [uf, setUf] = useState(editing?.state ?? '')
  const [status, setStatus] = useState<CepStatus>('idle')

  async function lookupCep(raw: string) {
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) {
      setStatus(digits.length === 0 ? 'idle' : 'error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        setStatus('error')
        return
      }
      const rua = [data.logradouro, data.bairro].filter(Boolean).join(', ')
      if (rua) setAddress(rua)
      if (data.localidade) setCity(data.localidade)
      if (data.uf) setUf(data.uf)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  return (
    <>
      <label className="agenda-field">
        <span className="agenda-label">Local / casa de show</span>
        <input
          name="venue"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          className="agenda-input"
          placeholder="Ex.: Pátio do Forró"
        />
      </label>

      <label className="agenda-field">
        <span className="agenda-label">CEP</span>
        <div className="relative">
          <input
            name="cep"
            value={cep}
            inputMode="numeric"
            maxLength={9}
            onChange={(e) => {
              const formatted = formatCep(e.target.value)
              setCep(formatted)
              setStatus('idle')
              if (formatted.replace(/\D/g, '').length === 8) lookupCep(formatted)
            }}
            onBlur={() => lookupCep(cep)}
            className="agenda-input pr-9"
            placeholder="00000-000"
            aria-describedby="cep-status"
          />
          <span
            id="cep-status"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
            aria-live="polite"
          >
            {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-[var(--artist-muted)]" />}
            {status === 'ok' && <Check className="h-4 w-4 text-emerald-400" />}
            {status === 'error' && <X className="h-4 w-4 text-red-400" />}
          </span>
        </div>
        {status === 'error' && (
          <span className="mt-1 text-[10px] font-bold text-red-400">CEP não encontrado. Preencha o endereço manualmente.</span>
        )}
        {status === 'ok' && (
          <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <MapPin className="h-3 w-3" /> Endereço preenchido automaticamente.
          </span>
        )}
      </label>

      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="agenda-field">
          <span className="agenda-label">Cidade</span>
          <input
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="agenda-input"
          />
        </label>
        <label className="agenda-field">
          <span className="agenda-label">Estado (UF)</span>
          <input
            name="state"
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase())}
            maxLength={2}
            className="agenda-input"
            placeholder="PE"
          />
        </label>
      </div>

      <label className="agenda-field">
        <span className="agenda-label">Endereço completo (para rota)</span>
        <input
          name="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="agenda-input"
          placeholder="Rua, número, bairro"
        />
      </label>
    </>
  )
}
