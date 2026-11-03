import { Film } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { FilmSection } from '@/components/FilmSection'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { MovementFilmCard } from '../view-model'

const POSTER_SIZES = '120px'

export function MovementFilms({ films, locale }: { films: MovementFilmCard[]; locale: Locale }) {
  if (films.length === 0) return null

  return (
    <FilmSection title={messages[locale].movement.sections.films}>
      <ul className="grid gap-x-12 gap-y-10 md:grid-cols-2">
        {films.map((film) => (
          <li
            key={film.href}
            className="group relative grid grid-cols-[120px_minmax(0,1fr)] items-start gap-5"
          >
            {film.posterPath ? (
              <div className="relative aspect-2/3">
                <Image
                  src={film.posterPath}
                  alt=""
                  fill
                  sizes={POSTER_SIZES}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="grid aspect-2/3 place-items-center border border-line text-muted">
                <Film size={28} strokeWidth={1.25} aria-hidden />
              </div>
            )}
            <div>
              {/* Bağlantı adı yalnızca başlık; ::after tüm kartı tıklanabilir yapar. */}
              <h3 className="font-display text-[26px] leading-[1.05] font-bold">
                <Link
                  href={film.href}
                  className="transition-colors duration-150 group-hover:text-accent after:absolute after:inset-0"
                >
                  {film.title}
                </Link>
              </h3>
              <p className="mt-2 text-[13px] text-muted">{film.caption}</p>
              {film.overview && (
                <p
                  data-testid="film-overview"
                  className="mt-3 line-clamp-4 text-sm leading-[1.6] wrap-break-word"
                >
                  {film.overview}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </FilmSection>
  )
}
