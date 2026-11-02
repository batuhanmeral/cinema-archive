import { Fragment } from 'react'
import { IndexItem } from '@/features/film/components/FilmIndex'
import type { MovementIndexKey, MovementIndexRow } from '../view-model'

// Ad listeleri esner; kısa değerler (yıl, ülke, görüntü) kendi genişliğinde kalır.
const LIST_KEYS: ReadonlySet<MovementIndexKey> = new Set(['pioneers', 'faces'])

/**
 * Yazılı tarih gelene kadar künye tek başına durur: boş metin sütunu yerine
 * içerik genişliğinde, etiketi değerin üstünde bir künye bandı.
 */
export function MovementIndex({ rows }: { rows: MovementIndexRow[] }) {
  return (
    <div className="wrap pt-(--section-gap)">
      <dl className="m-0 flex flex-wrap gap-x-12 gap-y-6 border-t border-line pt-5 text-[15px] leading-[1.45]">
        {rows.map((row) => (
          <div key={row.key} className={LIST_KEYS.has(row.key) ? 'min-w-64 flex-1' : 'flex-none'}>
            <dt className="text-[13px] text-muted">{row.label}</dt>
            <dd className="m-0 mt-1 wrap-break-word">
              {row.items.map((item, i) => (
                <Fragment key={`${item.text}-${i}`}>
                  {i > 0 && ', '}
                  <IndexItem item={item} />
                </Fragment>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
