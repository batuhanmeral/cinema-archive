import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function SectionLink({
  href,
  label,
  shortLabel,
  sectionName,
  prefetch,
}: {
  href: string
  label: string
  shortLabel: string
  sectionName: string
  prefetch?: boolean
}) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className="inline-flex shrink-0 items-center gap-2 text-[13px] text-muted transition-colors hover:text-accent"
    >
      <span className="hidden md:inline">{label}</span>
      <span className="md:hidden">
        {shortLabel} <span className="sr-only">– {sectionName}</span>
      </span>
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
    </Link>
  )
}
