import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'

export function SkipLink({ locale }: { locale: Locale }) {
  return (
    <a
      href="#content"
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-0 focus-visible:left-0 focus-visible:z-[60] focus-visible:bg-hall focus-visible:px-4 focus-visible:py-3 focus-visible:text-text"
    >
      {messages[locale].nav.skip}
    </a>
  )
}
