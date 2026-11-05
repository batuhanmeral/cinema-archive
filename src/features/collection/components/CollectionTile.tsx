import Image from 'next/image'
import Link from 'next/link'

// Izgara 3 / 2 / 1 sütun; en geniş kutu 384 px, yoğun ekranda w1280'e düşmesin diye koşullu.
const TILE_SIZES = '(min-resolution: 2dppx) 600px, (max-width: 767px) 100vw, 400px'

/**
 * 3:2 koleksiyon kutusu; ad ve film sayısı hall örtüsünün üstünde, tüm kutu ada bağlanır.
 * Görsel ve örtü -z-10 katmanında, yazılar konumlandırılmaz (::after kapsayıcıyı kaplasın).
 */
export function CollectionTile({
  name,
  href,
  meta,
  imagePath,
}: {
  name: string
  href: string
  meta: string
  imagePath: string | null
}) {
  return (
    <div className="group relative isolate flex aspect-3/2 flex-col justify-end overflow-hidden bg-surface px-4 pb-4 md:px-6 md:pb-5">
      {imagePath && (
        <Image
          src={imagePath}
          alt=""
          fill
          sizes={TILE_SIZES}
          className="-z-10 object-cover brightness-(--hero-poster-brightness)"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-hall/58 transition-colors duration-200 group-hover:bg-hall/45" />
      <p className="font-display text-[32px] leading-[.95] font-extrabold md:text-4xl">
        <Link
          href={href}
          className="block wrap-break-word transition-colors duration-150 group-hover:text-accent after:absolute after:inset-0"
        >
          {name}
        </Link>
      </p>
      {/* Hover örtüsünde bile AA için %80 metin; --muted burada 3.78:1'de kalıyordu. */}
      <p className="mt-1.5 text-[13px] text-text/80">{meta}</p>
    </div>
  )
}
