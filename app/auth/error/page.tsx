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
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="glass w-full max-w-sm rounded-2xl p-8 text-center">
        <Logo href="/" className="text-2xl" />
        <div className="mx-auto mt-6 flex size-14 items-center justify-center rounded-full bg-destructive/15">
          <TriangleAlert className="size-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-serif text-xl font-bold">Algo deu errado</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          {params?.error
            ? `Erro: ${params.error}`
            : 'Não foi possível completar a autenticação. Tente novamente.'}
        </p>
        <Link
          href="/auth/login"
          className="gradient-brand mt-6 inline-block rounded-full px-6 py-2.5 text-sm font-semibold text-black"
        >
          Tentar de novo
        </Link>
      </div>
    </main>
  )
}
