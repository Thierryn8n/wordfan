import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { Logo } from '@/components/wordfan/logo'

export const metadata = { title: 'Confirme seu e-mail — WordFan' }

export default function SignUpSuccessPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]"
      />
      <div className="relative w-full max-w-sm rounded-[32px] border border-white/8 bg-card p-8 text-center">
        <Logo href="/" className="text-2xl" />
        <div className="gradient-brand mx-auto mt-7 flex size-16 items-center justify-center rounded-full">
          <MailCheck className="size-7 text-white" aria-hidden="true" />
        </div>
        <h1 className="mt-6 font-serif text-xl font-black tracking-tight">VERIFIQUE SEU E-MAIL</h1>
        <p className="mt-3 text-xs font-bold leading-relaxed text-muted-foreground text-pretty">
          Enviamos um link de confirmação para o seu e-mail. Clique nele para ativar sua conta e
          liberar o acesso aos fan clubs.
        </p>
        <Link
          href="/auth/login"
          className="mt-7 inline-block text-[10px] font-black tracking-[0.2em] text-primary hover:underline"
        >
          VOLTAR PARA O LOGIN
        </Link>
      </div>
    </main>
  )
}
