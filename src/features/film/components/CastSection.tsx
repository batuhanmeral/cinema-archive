import { User } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Rail } from '@/components/rail/Rail'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { PersonCard } from '../view-model'
import { FilmSection } from './FilmSection'

// Planın sınırı; içe aktarma da 20 ile keser ama site pipeline/ modülünü içe aktaramaz.
const CAST_LIMIT = 20
// Kart 120 px (mobil) / 144 px; 2x ekranda w300–w500 yeterli.
const PHOTO_SIZES = '(max-width: 767px) 120px, 144px'
const CARD_CLASS = 'group relative w-30 flex-none md:w-36'

function PersonTile({ person }: { person: PersonCard }) {
  const role = person.role.trim()
  return (
    <li className={CARD_CLASS}>
      {person.profilePath ? (
        <div className="relative aspect-2/3">
          <Image
            src={person.profilePath}
            alt=""
            fill
            sizes={PHOTO_SIZES}
            className="object-cover"
          />
        </div>
      ) : (
        <div className="grid aspect-2/3 place-items-center border border-line text-muted">
          <User size={28} strokeWidth={1.25} aria-hidden />
        </div>
      )}
      <p className="mt-2 truncate text-xs font-semibold md:mt-2.5 md:text-[13px]">
        {person.href ? (
          // Kişi sayfaları M5'e kadar yok; ön yükleme 404 gürültüsü üretmesin.
          <Link
            href={person.href}
            prefetch={false}
            className="transition-colors duration-150 group-hover:text-accent after:absolute after:inset-0"
          >
            {person.name}
          </Link>
        ) : (
          person.name
        )}
      </p>
      {role && <p className="truncate text-[11px] text-muted md:text-xs">{role}</p>}
    </li>
  )
}

export function CastSection({
  directors,
  cast,
  locale,
}: {
  directors: PersonCard[]
  cast: PersonCard[]
  locale: Locale
}) {
  if (directors.length === 0 && cast.length === 0) return null
  const title = messages[locale].film.sections.cast
  const shownCast = cast.slice(0, CAST_LIMIT)

  return (
    <FilmSection title={title}>
      {/* Oklar fotoğrafın ortasında: 144 px genişlik × 3/2. */}
      <div className="flex gap-3 [--rail-image-h:216px] md:gap-5">
        {directors.length > 0 && (
          // Çok yönetmenli filmlerde (12'ye kadar) sabit sütun şeridi ezmesin; kendi içinde kayar.
          <ul className="flex max-w-1/2 flex-none gap-3 overflow-x-auto [scrollbar-width:none] md:gap-5 [&::-webkit-scrollbar]:hidden">
            {directors.map((person, i) => (
              <PersonTile key={`${person.name}-${i}`} person={person} />
            ))}
          </ul>
        )}
        {directors.length > 0 && shownCast.length > 0 && (
          <div aria-hidden className="w-px flex-none bg-line" />
        )}
        {shownCast.length > 0 && (
          <div className="min-w-0 flex-1">
            <Rail label={title} locale={locale}>
              {shownCast.map((person, i) => (
                <PersonTile key={`${person.name}-${i}`} person={person} />
              ))}
            </Rail>
          </div>
        )}
      </div>
    </FilmSection>
  )
}
