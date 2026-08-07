import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'

export const metadata = { title: 'Confirme seu e-mail — WordFan' }

export default function SignUpSuccessPage() {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-background px-6 pb-safe">
      <div className="ios-card mx-auto w-full max-w-sm p-8 text-center">
        <Logo href="/" className="text-2xl" />
        <div className="mx-auto mt-7 flex size-16 items-center justify-center rounded-full bg-primary/15">
          <MailCheck className="size-7 text-primary" aria-hidden="true" />
        </div>
        <h1 className="mt-6 text-[22px] font-bold tracking-[-0.019em]">Verifique seu e-mail</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--label-secondary)] text-pretty">
          Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta e
          liberar o acesso aos fan clubs.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block text-[17px] font-medium text-primary active:opacity-60"
        >
          Voltar para o login
        </Link>
      </div>
    </main>
  )
}
