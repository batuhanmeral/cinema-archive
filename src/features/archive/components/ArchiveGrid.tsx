import { PosterCard } from '@/components/PosterCard'
import type { Locale } from '@/lib/i18n/locale'
import { filmHref } from '@/lib/i18n/routes'
import type { ArchiveFilm } from '../schemas'

// 48, 2, 3, 4 ve 6 sütuna tam bölünür.
export const PAGE_SIZE = 48
const PLACEHOLDER_COUNT = 12

// Mobilde 2 sütun; masaüstünde en az 160 px'lik sütun en çok ≈210 px'e (768 px'te 3 sütun) genişler.
const POSTER_SIZES = '(max-width: 767px) 50vw, 220px'
const GRID =
  'wrap grid grid-cols-2 gap-x-4 gap-y-8 pt-10 md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:gap-x-5 md:gap-y-9'

// Kartın alt satırı "Yönetmen, yıl"; dizinde ilk yönetmen alt yazıdaki yönetmendir.
function caption(film: ArchiveFilm): string {
  const director = film.directors[0]
  return director ? `${director}, ${film.year}` : String(film.year)
}

export function ArchiveGrid({ films, locale }: { films: ArchiveFilm[]; locale: Locale }) {
  return (
    <ul className={GRID}>
      {films.map((film) => (
        <li key={film.slug} className="min-w-0">
          <PosterCard
            href={filmHref(locale, film.slug)}
            posterPath={film.poster}
            title={film.title}
            caption={caption(film)}
            sizes={POSTER_SIZES}
          />
        </li>
      ))}
    </ul>
  )
}

// Sorguyla gelen ziyaretçi süzülmemiş ızgarayı görmesin; dizin yüklenene dek boş afiş kutuları durur.
export function ArchiveGridPlaceholder() {
  return (
    <ul aria-busy="true" className={GRID}>
      {Array.from({ length: PLACEHOLDER_COUNT }, (_, i) => (
        <li key={i}>
          <div className="aspect-2/3 bg-surface" />
          <div className="mt-2 h-4 md:mt-3" />
          <div className="h-4" />
        </li>
      ))}
    </ul>
  )
}
