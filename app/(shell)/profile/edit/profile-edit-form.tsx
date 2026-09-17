'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Check,
  AlertTriangle,
  Trash2,
  Upload,
} from 'lucide-react'
import { updateProfile, deleteMyAccount } from '@/app/actions/profile'

export function ProfileEditForm({
  email,
  initialName,
  initialUsername,
  initialAvatar,
}: {
  email: string
  initialName: string
  initialUsername: string
  initialAvatar: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [username, setUsername] = useState(initialUsername)
  const [avatar, setAvatar] = useState(initialAvatar)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const usernameValid = /^[a-zA-Z0-9_.]{3,20}$/.test(username)
  const shownAvatar = preview || avatar

  const initials =
    (name || email.split('@')[0] || 'F')
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'F'

  function pickFile(f: File | null) {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Envie um arquivo de imagem válido.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5 MB.')
      return
    }
    setError(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function handleSave() {
    setError(null)
    setSaved(false)
    if (!usernameValid) {
      setError('Escolha um nome de usuário: 3 a 20 caracteres (letras, números, ponto ou _).')
      return
    }
    const fd = new FormData()
    fd.set('display_name', name)
    fd.set('username', username)
    fd.set('avatar_url', avatar)
    if (file) fd.set('avatar', file)
    startTransition(async () => {
      const res = await updateProfile(fd)
      if (res.error) {
        setError(res.error)
        return
      }
      if (res.avatarUrl) setAvatar(res.avatarUrl)
      setFile(null)
      setPreview(null)
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    })
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteMyAccount()
      if (res.error) {
        setError(res.error)
        setConfirmDelete(false)
        return
      }
      router.push('/home')
    })
  }

  return (
    <>
      <header className="flex items-center gap-4 px-6 pt-10">
        <Link
          href="/profile"
          aria-label="Voltar ao perfil"
          className="surface elev-1 flex size-10 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <div>
          <p className="text-[10px] font-black tracking-[0.3em] text-brand">SUA CONTA</p>
          <h1 className="mt-0.5 font-serif text-2xl font-black tracking-tight">EDITAR PERFIL</h1>
        </div>
      </header>

      <main className="mt-8 px-6">
        {/* Avatar + upload do dispositivo */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative"
            aria-label="Enviar foto de perfil"
          >
            {shownAvatar ? (
              <Image
                src={shownAvatar || '/placeholder.svg'}
                alt="Pré-visualização do avatar"
                width={96}
                height={96}
                unoptimized
                className="size-24 rounded-[28px] border border-white/10 object-cover"
              />
            ) : (
              <span className="surface flex size-24 items-center justify-center rounded-[28px] font-serif text-2xl font-black">
                {initials}
              </span>
            )}
            <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-xl bg-brand text-white shadow-lg transition-transform group-active:scale-90">
              <Upload className="size-4" aria-hidden="true" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-3 text-xs font-bold text-muted-foreground">{email}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-1 text-[11px] font-black tracking-[0.15em] text-brand"
          >
            ENVIAR FOTO DO DISPOSITIVO
          </button>
        </div>

        {/* Campos */}
        <div className="mt-8 flex flex-col gap-5">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black tracking-[0.2em] text-muted-foreground">
              NOME DE USUÁRIO <span className="text-brand">*</span>
            </span>
            <div className="ad-input flex items-center gap-1 !py-0">
              <span className="text-sm font-bold text-muted-foreground">@</span>
              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase())
                }
                maxLength={20}
                className="w-full bg-transparent py-3 outline-none"
                placeholder="seu_usuario"
                aria-invalid={username.length > 0 && !usernameValid}
              />
            </div>
            <span className="mt-1.5 block text-[10px] font-medium text-zinc-600">
              {username.length > 0 && !usernameValid
                ? 'De 3 a 20 caracteres: letras, números, ponto ou _.'
                : 'Este @ identifica você em chats, comentários e interações.'}
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-black tracking-[0.2em] text-muted-foreground">
              NOME DE EXIBIÇÃO
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="ad-input"
              placeholder="Como você quer ser chamado"
            />
          </label>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !usernameValid}
          className="gradient-brand elev-1 mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[11px] font-black tracking-[0.2em] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : saved ? (
            <Check className="size-4" aria-hidden="true" />
          ) : null}
          {saved ? 'SALVO!' : 'SALVAR ALTERAÇÕES'}
        </button>

        {/* Zona de perigo */}
        <section aria-labelledby="danger-heading" className="mt-12">
          <h2
            id="danger-heading"
            className="text-[10px] font-black tracking-[0.25em] text-muted-foreground"
          >
            ZONA DE PERIGO
          </h2>
          <div className="mt-3 rounded-[24px] border border-red-500/25 bg-red-500/5 p-5">
            <p className="text-sm font-extrabold text-red-300">Excluir minha conta</p>
            <p className="mt-1.5 text-xs text-muted-foreground text-pretty">
              Esta ação remove seus dados de perfil e encerra sua sessão. Não pode ser desfeita.
            </p>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/40 px-5 py-3 text-[11px] font-black tracking-[0.15em] text-red-300 transition-colors hover:bg-red-500/10"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                EXCLUIR CONTA
              </button>
            ) : (
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="surface flex-1 rounded-2xl px-4 py-3 text-[11px] font-black tracking-[0.15em] text-muted-foreground"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-[11px] font-black tracking-[0.15em] text-white disabled:opacity-60"
                >
                  {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                  CONFIRMAR
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
