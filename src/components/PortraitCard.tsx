import { User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

// Kart 120 px (mobil) / 168 px; 2x ekranda w300–w342 yeterli.
const PHOTO_SIZES = '(max-width: 767px) 120px, 168px'

/** 3:4 portre kartı; genişliği çağıran `<li>` belirler. */
export function PortraitCard({
  name,
  href,
  profilePath,
  note,
}: {
  name: string
  href?: string
  profilePath: string | null
  note: string
}) {
  return (
    <div className="group relative">
      {profilePath ? (
        <div className="relative aspect-3/4">
          <Image src={profilePath} alt="" fill sizes={PHOTO_SIZES} className="object-cover" />
        </div>
      ) : (
        <div className="grid aspect-3/4 place-items-center border border-line text-muted">
          <User size={28} strokeWidth={1.25} aria-hidden />
        </div>
      )}
      {/* Kırpma bağlantının kendisinde: kapsayıcıdaki overflow odak çizgisini keserdi. */}
      <p className="mt-2 text-[13px] font-semibold md:mt-3 md:text-sm">
        {href ? (
          // Kişi sayfaları M5'e kadar yok; ön yükleme 404 gürültüsü üretmesin.
          <Link
            href={href}
            prefetch={false}
            className="block truncate transition-colors duration-150 group-hover:text-accent after:absolute after:inset-0"
          >
            {name}
          </Link>
        ) : (
          <span className="block truncate">{name}</span>
        )}
      </p>
      <p className="truncate text-xs text-muted">{note}</p>
    </div>
  )
}
