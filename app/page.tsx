import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/data'
import { Logo } from '@/components/wordfan/logo'

export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (user) redirect('/home')

  return (
    <main className="relative flex min-h-dvh flex-col">
      <Image src="/content/hero-fans.png" alt="" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-end px-6 pb-12 pt-16">
        <Logo href="/" className="text-4xl" />
        <h1 className="mt-6 font-serif text-3xl font-bold leading-tight text-balance">
          Mais perto de quem faz a música que move você
        </h1>
        <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
          Conteúdo exclusivo, lives, bastidores e experiências únicas direto dos seus artistas favoritos.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/auth/sign-up"
            className="gradient-brand rounded-full py-3.5 text-center font-semibold text-black transition-opacity hover:opacity-90"
          >
            Criar conta grátis
          </Link>
          <Link
            href="/auth/login"
            className="glass rounded-full py-3.5 text-center font-semibold transition-colors hover:bg-secondary"
          >
            Já tenho conta
          </Link>
          <Link
            href="/home"
            className="py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Explorar sem conta
          </Link>
        </div>
      </div>
    </main>
  )
}
