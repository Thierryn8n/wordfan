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
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 pb-safe">
      <div className="ios-card mx-auto w-full max-w-sm p-8 text-center">
        <Logo href="/" className="text-2xl" />
        <div className="mx-auto mt-7 flex size-16 items-center justify-center rounded-full bg-destructive/15">
          <TriangleAlert className="size-7 text-destructive" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-[22px] font-bold tracking-[-0.019em]">Algo deu errado</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--label-secondary)] text-pretty">
          {params?.error
            ? `Erro: ${params.error}`
            : 'Não foi possível completar a autenticação. Tente novamente.'}
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block rounded-xl bg-primary px-7 py-3 text-[17px] font-semibold text-primary-foreground active:opacity-70"
        >
          Tentar de novo
        </Link>
      </div>
    </main>
  )
}
