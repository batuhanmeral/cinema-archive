import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function SectionLink({
  href,
  label,
  shortLabel,
  prefetch,
}: {
  href: string
  label: string
  shortLabel: string
  prefetch?: boolean
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-label={label}
      className="inline-flex shrink-0 items-center gap-2 text-[13px] text-muted transition-colors hover:text-accent"
    >
      <span aria-hidden className="hidden md:inline">
        {label}
      </span>
      <span aria-hidden className="md:hidden">
        {shortLabel}
      </span>
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
    </Link>
  )
}
