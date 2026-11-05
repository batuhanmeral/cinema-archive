import Link from 'next/link'
import { HeroBackground } from '@/components/HeroBackground'
import type { Locale } from '@/lib/i18n/locale'
import type { FilmView } from '../view-model'
import { FilmIndex } from './FilmIndex'

// TMDB hazır genişlikleri: mobilde w500, masaüstünde w780 yeterli; görsel zaten bulanık.
const POSTER_SIZES = '(max-width: 768px) 500px, 780px'

export function FilmHero({ view }: { view: FilmView; locale: Locale }) {
  return (
    <section className="relative flex min-h-svh flex-col justify-end">
      <HeroBackground imagePath={view.posterPath} sizes={POSTER_SIZES} />

      {/* Üst boşluk sabit navbarın altında kalır; içerik ekranı aşınca bölüm uzar. */}
      <div className="wrap relative grid items-end gap-x-16 gap-y-10 pt-24 pb-7 md:grid-cols-[1fr_340px] md:pb-12">
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(4rem,9.2vw,8.25rem)] leading-[.9] font-extrabold tracking-[.005em] wrap-break-word">
            {view.title}
          </h1>
          {view.originalTitle && (
            <p className="mt-3 text-xl text-muted wrap-break-word">{view.originalTitle}</p>
          )}
          {view.tags.length > 0 && (
            <ul
              data-testid="film-tags"
              className="mt-4 flex max-w-[60ch] flex-wrap gap-y-2 text-sm"
            >
              {view.tags.map((tag) => (
                <li key={tag.href ?? tag.text} className="mr-4">
                  {tag.href ? (
                    <Link
                      href={tag.href}
                      prefetch={tag.prefetch}
                      className="border-b border-accent text-accent"
                    >
                      {tag.text}
                    </Link>
                  ) : (
                    tag.text
                  )}
                </li>
              ))}
            </ul>
          )}
          {view.overview && (
            <p data-testid="film-overview" className="mt-6 max-w-[58ch] leading-[1.65]">
              {view.overview}
            </p>
          )}
        </div>
        <FilmIndex rows={view.index} />
      </div>
    </section>
  )
}
