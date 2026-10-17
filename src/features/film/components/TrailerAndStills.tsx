import Image from 'next/image'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { FilmView } from '../view-model'
import { FilmSection } from './FilmSection'
import { TrailerPlayer } from './TrailerPlayer'

const YOUTUBE_EMBED_BASE = 'https://www.youtube-nocookie.com/embed/'
// Anahtar veriden gelir; yalnızca düz YouTube kimliği URL'ye girer (yol/sorgu enjeksiyonu yok).
const TRAILER_KEY_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
// Tasarımda büyük karenin yanında iki kare var.
const SIDE_STILLS = 2
// 600 px üstü 2x ekranda w1280'i aşar ve yükleyici "original"a düşer; bu sınır onu önler.
const MAIN_SIZES = '(max-width: 767px) 100vw, 600px'
const SIDE_SIZES = '(max-width: 767px) 50vw, 400px'

function trailerUrl(key: string | null): string | null {
  if (!key || !TRAILER_KEY_PATTERN.test(key)) return null
  return `${YOUTUBE_EMBED_BASE}${key}?autoplay=1`
}

export function TrailerAndStills({ view, locale }: { view: FilmView; locale: Locale }) {
  const t = messages[locale].film
  const src = trailerUrl(view.trailerKey)
  const [mainStill, ...rest] = view.stills
  if (!mainStill && !src) return null

  const sideStills = rest.slice(0, SIDE_STILLS)
  // Kare yoksa afiş, kırpılmadan oynatma yüzeyi olur.
  const cover = mainStill ? (
    <Image src={mainStill} alt="" fill sizes={MAIN_SIZES} className="object-cover" />
  ) : (
    view.posterPath && (
      <Image src={view.posterPath} alt="" fill sizes={MAIN_SIZES} className="object-contain" />
    )
  )

  return (
    <FilmSection title={t.sections.trailer}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[2fr_1fr] md:grid-rows-2">
        <div
          className={`relative col-span-2 aspect-video md:col-span-1 md:row-span-2 ${mainStill ? '' : 'border border-line'}`}
        >
          {src ? (
            <TrailerPlayer
              src={src}
              title={`${view.title} – ${t.playTrailer}`}
              label={t.playTrailer}
            >
              {cover}
            </TrailerPlayer>
          ) : (
            cover
          )}
        </div>
        {sideStills.map((still) => (
          <div key={still} className="relative aspect-video md:aspect-auto">
            <Image src={still} alt="" fill sizes={SIDE_SIZES} className="object-cover" />
          </div>
        ))}
      </div>
    </FilmSection>
  )
}
