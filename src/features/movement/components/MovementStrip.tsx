import Image from 'next/image'
import Link from 'next/link'
import { slotAttr } from '@/lib/rotation'

// En fazla w1280: yüksek yoğunluklu ekranda 1200 px'i aşan aday "original" boyuta düşerdi.
const STRIP_SIZES =
  '(min-resolution: 3dppx) 400px, (min-resolution: 2dppx) 600px, (max-width: 767px) 100vw, 1200px'

const HEIGHT_CLASS = {
  strip: 'h-[110px] md:h-45',
  exit: 'h-60',
} as const

const NAME_CLASS = {
  strip: 'text-[32px] md:text-[56px]',
  exit: 'text-[32px] md:text-[72px]',
} as const

/**
 * Geniş görsel şerit; tüm şerit akım sayfasına gider. Görsel ve örtü -z-10 katmanında,
 * bağlantının ::after katmanı da kapsayıcıyı kaplayabilsin diye yazılar konumlandırılmaz.
 */
export function MovementStrip({
  name,
  href,
  meta,
  imagePath,
  height,
  linkLabel,
  rotationSlot,
  notes,
}: {
  name: string
  href: string
  meta: string
  imagePath: string | null
  height: keyof typeof HEIGHT_CLASS
  linkLabel?: string
  rotationSlot?: number
  notes?: { current: string; next: string }
}) {
  return (
    <div
      data-strip-slot={rotationSlot !== undefined && notes ? slotAttr(rotationSlot) : undefined}
      className={`group relative isolate flex flex-col justify-end overflow-hidden px-4 pb-4 md:px-8 md:pb-6 ${HEIGHT_CLASS[height]}`}
    >
      {imagePath && (
        <Image
          src={imagePath}
          alt=""
          fill
          sizes={STRIP_SIZES}
          className="-z-10 object-cover brightness-(--hero-poster-brightness)"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-hall/58 transition-colors duration-200 group-hover:bg-hall/45" />
      <p
        className={`font-display leading-[.92] font-extrabold tracking-[.005em] ${NAME_CLASS[height]}`}
      >
        <Link
          href={href}
          aria-label={linkLabel}
          className="-mb-[.14em] block truncate pb-[.14em] transition-colors duration-150 group-hover:text-accent after:absolute after:inset-0"
        >
          {name}
        </Link>
      </p>
      {/* Taslaktaki gibi %80 metin: beyaz karede, hover örtüsünde bile 4.88:1; --muted 3.78:1'de kalıyordu. */}
      <p className="mt-1 truncate text-xs text-text/80 md:text-[13px]">
        {meta}
        {rotationSlot !== undefined && notes && (
          <>
            <span data-note="current" className="hidden text-accent italic">
              {' '}
              · {notes.current}
            </span>
            <span data-note="next" className="hidden text-accent italic">
              {' '}
              · {notes.next}
            </span>
          </>
        )}
      </p>
    </div>
  )
}
