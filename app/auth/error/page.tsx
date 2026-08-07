import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'

export const metadata = { title: 'Erro de autenticação — WordFan' }

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-destructive/10 blur-[120px]"
      />
      <div className="relative w-full max-w-sm rounded-[32px] border border-white/8 bg-card p-8 text-center">
        <Logo href="/" className="text-2xl" />
        <div className="mx-auto mt-7 flex size-16 items-center justify-center rounded-full bg-destructive/15">
          <TriangleAlert className="size-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-serif text-xl font-black tracking-tight">ALGO DEU ERRADO</h1>
        <p className="mt-3 text-xs font-bold leading-relaxed text-muted-foreground text-pretty">
          {params?.error
            ? `Erro: ${params.error}`
            : 'Não foi possível completar a autenticação. Tente novamente.'}
        </p>
        <Link
          href="/auth/login"
          className="gradient-brand mt-7 inline-block rounded-full px-7 py-3 text-[10px] font-black tracking-[0.2em] text-white"
        >
          TENTAR DE NOVO
        </Link>
      </div>
    </main>
  )
}
