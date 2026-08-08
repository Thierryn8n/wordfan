'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Pencil, X, Loader2, Upload, Trash2, AlertTriangle, User } from 'lucide-react'
import { updateMyProfile, uploadMyAvatar, deleteMyAccount } from './actions'

export function ProfileEditor({
  initialName,
  initialAvatar,
}: {
  initialName: string
  initialAvatar: string | null
}) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(initialName)
  const [avatar, setAvatar] = useState(initialAvatar ?? '')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const res = await updateMyProfile({ displayName: name, avatarUrl: avatar })
      if (res.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadMyAvatar(fd)
    setUploading(false)
    if (res.error) {
      setError(res.error)
      return
    }
    if (res.url) setAvatar(res.url)
  }

  function handleDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteMyAccount()
      if (res.error) {
        setError(res.error)
        return
      }
      router.push('/')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null)
          setOpen(true)
        }}
        className="skeu-raised flex size-11 items-center justify-center rounded-2xl text-foreground"
        aria-label="Editar perfil"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
        >
          <div className="glass-panel sheen relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[32px] p-6 sm:rounded-[32px]">
            <div className="flex items-center justify-between">
              <h2 id="edit-profile-title" className="font-serif text-lg font-black">
                EDITAR PERFIL
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="skeu-raised flex size-9 items-center justify-center rounded-full"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            {/* Avatar */}
            <div className="mt-6 flex items-center gap-4">
              <span className="skeu-raised flex size-20 items-center justify-center overflow-hidden rounded-3xl">
                {avatar ? (
                  <Image
                    src={avatar || '/placeholder.svg'}
                    alt=""
                    width={80}
                    height={80}
                    className="size-20 object-cover"
                  />
                ) : (
                  <User className="size-8 text-muted-foreground" aria-hidden="true" />
                )}
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="skeu flex items-center gap-2 rounded-full px-4 py-2.5 text-[10px] font-black tracking-[0.15em] disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Upload className="size-3.5" aria-hidden="true" />
                  )}
                  {uploading ? 'ENVIANDO...' : 'ENVIAR FOTO'}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleUpload(f)
                  }}
                />
                <p className="text-[9px] font-bold text-muted-foreground">PNG, JPG ou WebP · máx 5MB</p>
              </div>
            </div>

            {/* Nome */}
            <label className="mt-5 flex flex-col gap-1.5">
              <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
                NOME DE EXIBIÇÃO
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Seu nome"
                className="skeu-inset rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand"
              />
            </label>

            {/* URL do avatar (alternativa ao upload) */}
            <label className="mt-4 flex flex-col gap-1.5">
              <span className="text-[9px] font-black tracking-[0.2em] text-muted-foreground">
                URL DA FOTO (OPCIONAL)
              </span>
              <input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
                className="skeu-inset rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-1 focus:ring-brand"
              />
            </label>

            {error && (
              <p role="alert" className="mt-4 text-xs font-bold text-destructive">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || !name.trim()}
              className="skeu-btn sheen relative mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[11px] font-black tracking-[0.25em] text-white disabled:opacity-50"
            >
              {isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {isPending ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>

            {/* Zona de perigo */}
            <div className="skeu-inset mt-6 rounded-2xl p-4">
              <p className="text-[9px] font-black tracking-[0.2em] text-destructive">ZONA DE PERIGO</p>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-[10px] font-black tracking-[0.15em] text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                  EXCLUIR MINHA CONTA
                </button>
              ) : (
                <div className="mt-3">
                  <p className="flex items-start gap-2 text-xs font-bold leading-relaxed text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                    Esta ação é permanente e apaga todos os seus dados e assinaturas.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="skeu flex-1 rounded-full py-2.5 text-[10px] font-black tracking-[0.15em]"
                    >
                      CANCELAR
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isPending}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-destructive py-2.5 text-[10px] font-black tracking-[0.15em] text-white disabled:opacity-50"
                    >
                      {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
                      CONFIRMAR
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
