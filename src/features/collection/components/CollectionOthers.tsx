import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { FilmSection } from '@/components/FilmSection'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { collectionsHref } from '@/lib/i18n/routes'
import type { OtherCollection } from '../view-model'
import { CollectionTile } from './CollectionTile'

export function CollectionOthers({
  others,
  locale,
}: {
  others: OtherCollection[]
  locale: Locale
}) {
  if (others.length === 0) return null
  const t = messages[locale].collection

  return (
    <FilmSection
      title={t.others}
      action={
        <Link
          href={collectionsHref(locale)}
          className="inline-flex items-center gap-1.5 text-sm transition-colors duration-150 hover:text-accent"
        >
          {t.all}
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        </Link>
      }
    >
      <ul className="grid gap-x-6 gap-y-10 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
        {others.map((other) => (
          <li key={other.href}>
            <CollectionTile
              name={other.name}
              href={other.href}
              meta={other.meta}
              imagePath={other.imagePath}
            />
          </li>
        ))}
      </ul>
    </FilmSection>
  )
}
