import { Film } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment } from 'react'
import { IndexItem } from '@/components/IndexItem'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { LinkItem } from '@/lib/link-items'
import type { CollectionRow } from '../view-model'

// Masaüstü sütunları: sıra, afiş, film, yönetmen, tür, tema. Mobilde yalnızca afiş + metin.
const ROW_GRID =
  'grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[48px_80px_minmax(0,1fr)_150px_130px_170px]'
const POSTER_SIZES = '80px'

// Bağlantılar satır bağlantısının ::after katmanının üstünde durur (z-10) ve bağımsız çalışır.
function LinkCell({ items }: { items: LinkItem[] }) {
  return (
    <>
      {items.map((item, i) => (
        <Fragment key={`${item.text}-${i}`}>
          {i > 0 && ', '}
          <span className="relative z-10">
            <IndexItem item={item} />
          </span>
        </Fragment>
      ))}
    </>
  )
}

function Poster({ path }: { path: string | null }) {
  if (!path) {
    return (
      <div className="grid aspect-2/3 place-items-center border border-line text-muted">
        <Film size={24} strokeWidth={1.25} aria-hidden />
      </div>
    )
  }
  return (
    <div className="relative aspect-2/3">
      <Image src={path} alt="" fill sizes={POSTER_SIZES} className="object-cover" />
    </div>
  )
}

export function CollectionList({ rows, locale }: { rows: CollectionRow[]; locale: Locale }) {
  const columns = messages[locale].collection.columns
  return (
    <div className="wrap pt-(--section-gap)">
      <div
        className={`hidden gap-6 border-t border-b border-line py-2.5 text-xs text-muted md:grid ${ROW_GRID}`}
      >
        <span>{columns.number}</span>
        <span className="col-span-2">{columns.film}</span>
        <span>{columns.director}</span>
        <span>{columns.genre}</span>
        <span>{columns.theme}</span>
      </div>
      <ul className="max-md:border-t max-md:border-line">
        {rows.map((row) => (
          <li
            key={row.href}
            className={`group relative grid items-start gap-4 border-b border-line py-4 transition-colors duration-200 hover:bg-surface md:gap-6 ${ROW_GRID}`}
          >
            <span className="hidden pl-2 font-display text-[22px] leading-none font-bold text-muted md:block">
              {String(row.number).padStart(2, '0')}
            </span>
            <Poster path={row.posterPath} />
            <div className="min-w-0 max-md:col-start-2 md:col-span-1">
              {/* Bağlantı adı başlık ve yıl; ::after tüm satırı tıklanabilir yapar. */}
              <h3 className="font-display text-[26px] leading-[1.1] font-bold">
                <Link
                  href={row.href}
                  className="transition-colors duration-150 group-hover:text-accent after:absolute after:inset-0"
                >
                  {row.title} <span className="font-bold text-muted">– {row.year}</span>
                </Link>
              </h3>
              {row.originalTitle && (
                <p className="mt-1 truncate text-[13px] text-muted">{row.originalTitle}</p>
              )}
              {row.overview && (
                <p className="mt-2.5 line-clamp-3 max-w-[64ch] text-sm leading-[1.6] wrap-break-word">
                  {row.overview}
                </p>
              )}
            </div>
            <p className="hidden pt-1.5 text-[13px] leading-normal md:block">
              <LinkCell items={row.directors} />
            </p>
            <p className="hidden pt-1.5 text-[13px] leading-normal text-muted md:block">
              <LinkCell items={row.genres} />
            </p>
            <p className="hidden pt-1.5 text-[13px] leading-normal text-muted md:block">
              <LinkCell items={row.themes} />
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
