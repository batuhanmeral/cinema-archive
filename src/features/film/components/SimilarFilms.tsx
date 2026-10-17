import 'server-only'
import { PosterCard } from '@/components/PosterCard'
import { Rail } from '@/components/rail/Rail'
import { store } from '@/lib/data'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { filmHref } from '@/lib/i18n/routes'
import type { SimilarFilm } from '../similar'
import { FilmSection } from './FilmSection'

function caption(item: SimilarFilm): string {
  const director = item.film.crew.find((member) => member.job === 'director')
  const name = director && store.people().get(director.personId)?.name
  return name ? `${name}, ${item.film.year}` : String(item.film.year)
}

export function SimilarFilms({ items, locale }: { items: SimilarFilm[]; locale: Locale }) {
  if (items.length === 0) return null
  const t = messages[locale].film

  return (
    <FilmSection title={t.sections.similar}>
      {/* Oklar afişin ortasında: 156 px genişlik × 3/2. */}
      <div className="[--rail-image-h:234px]">
        <Rail label={t.sections.similar} locale={locale}>
          {items.map((item) => (
            <li key={item.film.slug} className="w-30 md:w-39">
              <PosterCard
                href={filmHref(locale, item.film.slug)}
                posterPath={item.film.poster[locale]}
                title={item.film.title[locale]}
                caption={caption(item)}
                note={t.similarReason[item.reason]}
              />
            </li>
          ))}
        </Rail>
      </div>
    </FilmSection>
  )
}
