import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { HallLink } from '../view-model'
import { MovementStrip } from './MovementStrip'

export function HallExit({
  previous,
  next,
  locale,
}: {
  previous: HallLink
  next: HallLink
  locale: Locale
}) {
  const t = messages[locale].movement
  return (
    <div className="wrap pt-(--section-gap)">
      <div className="mb-2 flex items-center justify-between gap-4 text-[13px] text-muted">
        <Link
          href={previous.href}
          className="inline-flex min-w-0 items-center gap-2 text-text transition-colors duration-150 hover:text-accent"
        >
          <ArrowLeft size={16} strokeWidth={1.5} aria-hidden className="flex-none" />
          <span className="truncate">
            {t.previous}: {previous.name}
          </span>
        </Link>
        <span className="flex-none">{t.next}</span>
      </div>
      <MovementStrip
        name={next.name}
        href={next.href}
        meta={next.meta}
        imagePath={next.imagePath}
        height="exit"
      />
    </div>
  )
}
