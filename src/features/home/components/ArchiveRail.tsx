'use client'

import { PosterCard } from '@/components/PosterCard'
import { Rail } from '@/components/rail/Rail'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { posterPoolSchema, type PosterItem } from '../schemas'
import { useRandomPick } from '../use-random-pick'

export function ArchiveRail({
  initial,
  url,
  locale,
}: {
  initial: PosterItem[]
  url: string
  locale: Locale
}) {
  const picked = useRandomPick(initial, 16, { url, schema: posterPoolSchema })
  return (
    <div className="[--rail-image-h:234px]">
      <Rail label={messages[locale].home.sections.archive} locale={locale}>
        {picked.map((film) => (
          <li key={film.href} className="w-30 md:w-39">
            <PosterCard {...film} />
          </li>
        ))}
      </Rail>
    </div>
  )
}
