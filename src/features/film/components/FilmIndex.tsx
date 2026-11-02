import Link from 'next/link'
import { Fragment } from 'react'
import type { LinkItem } from '@/lib/link-items'
import type { IndexRow } from '../view-model'

export function IndexItem({ item }: { item: LinkItem }) {
  if (!item.href) return item.text
  return (
    // Arşiv (M4) ve kişi (M5) bağlantıları prefetch: false taşır; sayfaları henüz yok.
    <Link
      href={item.href}
      prefetch={item.prefetch}
      className="transition-colors duration-150 hover:text-accent"
    >
      {item.text}
    </Link>
  )
}

export function FilmIndex({ rows }: { rows: IndexRow[] }) {
  return (
    // 88 px tasarım ölçüsü; "Cinematography" gibi uzun İngilizce etiket sığmazsa sütun genişler.
    <dl className="m-0 grid grid-cols-[minmax(88px,auto)_1fr] gap-x-4 gap-y-2 text-[13px] leading-[1.45]">
      {rows.map((row) => (
        <Fragment key={row.key}>
          <dt className="text-muted">{row.label}</dt>
          <dd className="m-0 min-w-0 wrap-break-word">
            {row.items.map((item, i) => (
              <Fragment key={`${item.text}-${i}`}>
                {i > 0 && ', '}
                <IndexItem item={item} />
              </Fragment>
            ))}
          </dd>
        </Fragment>
      ))}
    </dl>
  )
}
