import { TmdbCredit } from '@/components/TmdbCredit'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { MovementStrip } from './components/MovementStrip'
import type { HallLink } from './view-model'

export function MovementsListPage({ locale, strips }: { locale: Locale; strips: HallLink[] }) {
  return (
    <main id="content">
      <h1 className="wrap pt-28 pb-8 font-display text-5xl leading-none font-extrabold md:text-7xl">
        {messages[locale].movement.listTitle}
      </h1>
      <ul className="wrap grid gap-3 md:gap-4">
        {strips.map((strip) => (
          <li key={strip.href} className="min-w-0">
            <MovementStrip {...strip} height="strip" />
          </li>
        ))}
      </ul>
      <TmdbCredit locales={[locale]} />
    </main>
  )
}
