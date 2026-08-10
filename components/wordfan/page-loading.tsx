import Image from 'next/image'

interface PageLoadingProps {
  logoUrl?: string | null
  siteName?: string
}

/**
 * Componente de loading de página — exibido pelo Next.js App Router
 * enquanto um Server Component carrega (via Suspense / loading.tsx).
 *
 * É um Server Component (sem 'use client') pois recebe os dados do servidor.
 */
export function PageLoading({ logoUrl, siteName = 'WordFan' }: PageLoadingProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background">
      {/* Glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[60px]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={siteName}
            width={160}
            height={64}
            className="h-12 w-auto object-contain opacity-90"
            priority
            unoptimized
          />
        ) : (
          <span className="font-serif text-4xl font-black tracking-tight select-none">
            <span className="text-foreground/80">Word</span>
            <span className="text-gradient-brand">Fan</span>
          </span>
        )}

        {/* Barra de progresso indeterminada */}
        <div className="h-0.5 w-32 overflow-hidden rounded-full bg-white/8">
          <div className="h-full w-1/2 animate-[shimmer_1.4s_ease-in-out_infinite] rounded-full bg-primary/70" />
        </div>
      </div>
    </div>
  )
}
