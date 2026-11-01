import Image from 'next/image'
import { TRAILER_KEY_PATTERN } from '@/data/schemas'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { FilmView } from '../view-model'
import { FilmSection } from './FilmSection'
import { TrailerPlayer } from './TrailerPlayer'

const YOUTUBE_EMBED_BASE = 'https://www.youtube-nocookie.com/embed/'
// Tasarımda büyük karenin yanında iki kare var.
const SIDE_STILLS = 2
// Yan kare yoksa büyük kare tam genişlik; varsa yan sütun 2fr:1fr ile yanına oturur.
const GRID_BY_SIDE_COUNT = ['', 'md:grid-cols-[2fr_1fr]', 'md:grid-cols-[2fr_1fr] md:grid-rows-2']
const MAIN_BY_SIDE_COUNT = ['', 'md:col-span-1', 'md:col-span-1 md:row-span-2']
// 600 px üstü 2x ekranda w1280'i aşar ve yükleyici "original"a düşer; bu sınır onu önler.
const MAIN_SIZES = '(max-width: 767px) 100vw, 600px'
// Tam genişlikte 1x ekran w1280 alır; 2x ekranda da 600 px sınırı korunur.
const FULL_SIZES = '(max-width: 767px) 100vw, (min-resolution: 2dppx) 600px, 1200px'
const SIDE_SIZES = '(max-width: 767px) 50vw, 400px'
// Tek yan kare mobilde tam genişlik olduğundan 50vw yetersiz kalır.
const SINGLE_SIDE_SIZES = '(max-width: 767px) 100vw, 400px'

// Veri şemada doğrulanır; görünüm modeli düz string taşıdığından URL kurulmadan önce yine denetlenir.
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
  // Tek yan kare mobilde iki sütunu kaplar; masaüstünde tek satırda büyük karenin boyuna uzar.
  const sideClass = sideStills.length === 1 ? 'col-span-2 md:col-span-1' : ''
  const sideSizes = sideStills.length === 1 ? SINGLE_SIDE_SIZES : SIDE_SIZES
  const mainSizes = sideStills.length === 0 ? FULL_SIZES : MAIN_SIZES
  // Kare yoksa afiş, kırpılmadan oynatma yüzeyi olur.
  const cover = mainStill ? (
    <Image src={mainStill} alt="" fill sizes={mainSizes} className="object-cover" />
  ) : (
    view.posterPath && (
      <Image src={view.posterPath} alt="" fill sizes={MAIN_SIZES} className="object-contain" />
    )
  )

  return (
    <FilmSection title={t.sections.trailer}>
      <div className={`grid grid-cols-2 gap-3 ${GRID_BY_SIDE_COUNT[sideStills.length]}`}>
        <div
          className={`relative col-span-2 aspect-video ${MAIN_BY_SIDE_COUNT[sideStills.length]} ${mainStill ? '' : 'border border-line'}`}
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
          <div key={still} className={`relative aspect-video md:aspect-auto ${sideClass}`}>
            <Image src={still} alt="" fill sizes={sideSizes} className="object-cover" />
          </div>
        ))}
      </div>
    </FilmSection>
  )
}
