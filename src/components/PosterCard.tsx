import { Film } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// Kart 120 px (mobil) / 156 px; TMDB yükleyicisi bunu w342'ye kadar karşılar.
const POSTER_SIZES = '(max-width: 767px) 120px, 156px'

export function PosterCard({
  href,
  posterPath,
  title,
  caption,
  note,
}: {
  href: string
  posterPath: string | null
  title: string
  caption: string
  note?: string
}) {
  return (
    <div className="group relative">
      {posterPath ? (
        <div className="relative aspect-2/3">
          <Image src={posterPath} alt="" fill sizes={POSTER_SIZES} className="object-cover" />
        </div>
      ) : (
        <div className="grid aspect-2/3 place-items-center border border-line text-muted">
          <Film size={28} strokeWidth={1.25} aria-hidden />
        </div>
      )}
      {/* Bağlantı adı yalnızca başlık; ::after tüm kartı tıklanabilir yapar. */}
      <Link
        href={href}
        className="mt-2 block truncate text-xs font-semibold transition-colors duration-150 group-hover:text-accent after:absolute after:inset-0 md:mt-2.5 md:text-[13px]"
      >
        {title}
      </Link>
      {caption && <p className="truncate text-[11px] text-muted md:text-xs">{caption}</p>}
      {note && <p className="mt-0.5 truncate text-[11px] text-accent md:text-xs">{note}</p>}
    </div>
  )
}
