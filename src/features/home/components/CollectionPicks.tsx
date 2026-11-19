'use client'

import { CollectionTile } from '@/features/collection/components/CollectionTile'
import type { OtherCollection } from '@/features/collection/view-model'
import { useRandomPick } from '../use-random-pick'

export function CollectionPicks({
  initial,
  collections,
}: {
  initial: OtherCollection[]
  collections: OtherCollection[]
}) {
  const picked = useRandomPick(initial, 6, { items: collections })
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 min-[900px]:grid-cols-3">
      {picked.map((collection, index) => (
        <li key={collection.href} className={index >= 2 ? 'hidden md:block' : ''}>
          <CollectionTile {...collection} />
        </li>
      ))}
    </ul>
  )
}
