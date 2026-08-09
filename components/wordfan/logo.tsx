import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Logo({ className, href = '/home', imageUrl }: { className?: string; href?: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <Link href={href} className={cn('inline-flex items-center', className)}>
        <Image
          src={imageUrl}
          alt="Logo"
          width={120}
          height={40}
          className="h-8 w-auto object-contain"
        />
      </Link>
    )
  }
  
  return (
    <Link href={href} className={cn('inline-flex items-baseline gap-0.5 font-serif font-bold tracking-tight', className)}>
      <span className="text-foreground">Word</span>
      <span className="text-gradient-brand">Fan</span>
    </Link>
  )
}
