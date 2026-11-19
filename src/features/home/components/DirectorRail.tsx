'use client'

import { PortraitCard } from '@/components/PortraitCard'
import { Rail } from '@/components/rail/Rail'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { directorPoolSchema, type DirectorItem } from '../schemas'
import { useRandomPick } from '../use-random-pick'

export function DirectorRail({
  initial,
  url,
  locale,
}: {
  initial: DirectorItem[]
  url: string
  locale: Locale
}) {
  const picked = useRandomPick(initial, 12, { url, schema: directorPoolSchema })
  return (
    <div className="[--rail-image-h:224px]">
      <Rail label={messages[locale].home.sections.directors} locale={locale}>
        {picked.map((director) => (
          <li key={director.href} className="w-30 md:w-42">
            <PortraitCard {...director} />
          </li>
        ))}
      </Rail>
    </div>
  )
}
