'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Sparkles } from 'lucide-react'
import { completeOnboarding, dismissOnboarding } from '@/app/(shell)/onboarding-actions'

/**
 * Mini-painel de boas-vindas: aparece uma única vez (no primeiro acesso do fã)
 * para capturar foto de perfil e nome de usuário. Ao concluir ou adiar, o
 * servidor grava `profiles.onboarded_at`, então não volta a aparecer.
 */
export function OnboardingModal({ initialName }: { initialName?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState(initialName ?? '')
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // @username é obrigatório (padrão Instagram) e é a identidade em toda interação.
  const usernameValid = /^[a-zA-Z0-9_.]{3,20}$/.test(username)

  if (!open) return null

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem.')
      return
    }
    setError(null)
    setPreview(URL.createObjectURL(file))
  }

  function submit() {
    setError(null)
    if (!usernameValid) {
      setError('Escolha um nome de usuário: 3 a 20 caracteres (letras, números, ponto ou _).')
      return
    }
    const fd = new FormData()
    fd.set('username', username)
    fd.set('display_name', displayName)
    const file = fileRef.current?.files?.[0]
    if (file) fd.set('avatar', file)

    startTransition(async () => {
      const res = await completeOnboarding(fd)
      if (!res.ok) {
        setError(res.error ?? 'Não foi possível salvar. Tente novamente.')
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  function later() {
    startTransition(async () => {
      await dismissOnboarding()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="onboarding-card w-full max-w-md rounded-t-3xl border border-white/10 bg-[var(--card,#141018)] p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand,#ff5a1f)]/15 text-[var(--brand,#ff5a1f)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 id="onboarding-title" className="text-base font-black leading-none text-white">
              Bem-vindo ao WordFan!
            </h2>
            <p className="mt-1 text-[11px] font-semibold text-white/50">
              Personalize seu perfil pra começar.
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative h-24 w-24 overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-white/5 transition hover:border-[var(--brand,#ff5a1f)]"
            aria-label="Escolher foto de perfil"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview || "/placeholder.svg"} alt="Pré-visualização do perfil" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-white/40 group-hover:text-white/70">
                <Camera className="h-6 w-6" />
                <span className="text-[9px] font-bold uppercase tracking-wide">Foto</span>
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
          <span className="text-[10px] font-semibold text-white/40">Toque para escolher uma imagem (opcional)</span>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
              Nome de usuário <span className="text-[var(--brand,#ff5a1f)]">*</span>
            </span>
            <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-3 focus-within:border-[var(--brand,#ff5a1f)]">
              <span className="text-sm font-bold text-white/40">@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())}
                maxLength={20}
                className="w-full bg-transparent px-1 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/30"
                placeholder="seu_usuario"
                aria-invalid={username.length > 0 && !usernameValid}
              />
            </div>
            <span className="text-[10px] font-semibold text-white/40">
              {username.length > 0 && !usernameValid
                ? 'De 3 a 20 caracteres: letras, números, ponto ou _.'
                : 'Este @ vai identificar você em chats, comentários e interações.'}
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-white/50">
              Nome de exibição
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-[var(--brand,#ff5a1f)]"
              placeholder="Como devemos te chamar?"
            />
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-400">{error}</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !usernameValid}
            className="flex items-center justify-center gap-2 rounded-xl bg-[var(--brand,#ff5a1f)] px-4 py-3 text-sm font-black text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Concluir e entrar
          </button>
          <button
            type="button"
            onClick={later}
            disabled={pending}
            className="rounded-xl px-4 py-2 text-[12px] font-bold text-white/50 transition hover:text-white/80 disabled:opacity-60"
          >
            Deixar para depois
          </button>
        </div>
      </div>
    </div>
  )
}
