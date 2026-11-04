import { TmdbCredit } from '@/components/TmdbCredit'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { CollectionTile } from './components/CollectionTile'
import type { OtherCollection } from './view-model'

export function CollectionsListPage({
  locale,
  tiles,
}: {
  locale: Locale
  tiles: OtherCollection[]
}) {
  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <h1 className="wrap pt-28 pb-8 font-display text-5xl leading-none font-extrabold md:text-7xl">
        {messages[locale].collection.listTitle}
      </h1>
      <ul className="wrap grid gap-x-6 gap-y-10 min-[560px]:grid-cols-2 min-[900px]:grid-cols-3">
        {tiles.map((tile) => (
          <li key={tile.href} className="min-w-0">
            <CollectionTile {...tile} />
          </li>
        ))}
      </ul>
      <TmdbCredit locales={[locale]} />
    </main>
  )
}
