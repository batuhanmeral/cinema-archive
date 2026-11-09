import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import type { PerdeFrameData } from '../view-model'
import { PerdeFrame } from './PerdeFrame'

export function Perde({
  frames,
  locale,
}: {
  frames: PerdeFrameData[]
  buildWeek: number
  locale: Locale
}) {
  return (
    <section
      aria-label={messages[locale].home.notes.current}
      className="relative h-svh overflow-hidden bg-hall"
    >
      {frames.map((frame) => (
        <PerdeFrame key={frame.slot} frame={frame} locale={locale} />
      ))}
    </section>
  )
}
