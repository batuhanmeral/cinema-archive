import { PortraitCard } from '@/components/PortraitCard'
import { Rail } from '@/components/rail/Rail'
import { FilmSection } from '@/components/FilmSection'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { DirectorCard } from '../view-model'

export function MovementDirectors({
  directors,
  locale,
}: {
  directors: DirectorCard[]
  locale: Locale
}) {
  if (directors.length === 0) return null
  const title = messages[locale].movement.sections.directors

  return (
    <FilmSection title={title}>
      {/* Oklar fotoğrafın ortasında: 168 px genişlik × 4/3. */}
      <div className="[--rail-image-h:224px]">
        <Rail label={title} locale={locale}>
          {directors.map((director, i) => (
            <li key={`${director.name}-${i}`} className="w-30 md:w-42">
              <PortraitCard {...director} />
            </li>
          ))}
        </Rail>
      </div>
    </FilmSection>
  )
}
