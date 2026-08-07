import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'

export const metadata = { title: 'Confirme seu e-mail — WordFan' }

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="glass w-full max-w-sm rounded-2xl p-8 text-center">
        <Logo href="/" className="text-2xl" />
        <div className="gradient-brand mx-auto mt-6 flex size-14 items-center justify-center rounded-full">
          <MailCheck className="size-7 text-black" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-serif text-xl font-bold">Verifique seu e-mail</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta e
          liberar o acesso aos fan clubs.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  )
}
