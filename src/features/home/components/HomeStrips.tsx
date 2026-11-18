import { MovementStrip } from '@/features/movement/components/MovementStrip'
import type { HallLink } from '@/features/movement/view-model'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { slotAttr } from '@/lib/rotation'

export function HomeStrips({ strips, locale }: { strips: HallLink[]; locale: Locale }) {
  return (
    <ul className="grid gap-3 md:gap-4">
      {strips.map((strip) => (
        <li key={strip.href} data-home-strip={slotAttr(strip.rotationSlot)} className="min-w-0">
          <MovementStrip {...strip} height="strip" notes={messages[locale].home.notes} />
        </li>
      ))}
    </ul>
  )
}
