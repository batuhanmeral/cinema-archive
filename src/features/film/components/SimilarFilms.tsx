import { PosterCard } from '@/components/PosterCard'
import { Rail } from '@/components/rail/Rail'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { SimilarCard } from '../view-model'
import { FilmSection } from './FilmSection'

export function SimilarFilms({ cards, locale }: { cards: SimilarCard[]; locale: Locale }) {
  if (cards.length === 0) return null
  const title = messages[locale].film.sections.similar

  return (
    <FilmSection title={title}>
      {/* Oklar afişin ortasında: 156 px genişlik × 3/2. */}
      <div className="[--rail-image-h:234px]">
        <Rail label={title} locale={locale}>
          {cards.map((card) => (
            <li key={card.slug} className="w-30 md:w-39">
              <PosterCard
                href={card.href}
                posterPath={card.posterPath}
                title={card.title}
                caption={card.caption}
                note={card.note}
              />
            </li>
          ))}
        </Rail>
      </div>
    </FilmSection>
  )
}
