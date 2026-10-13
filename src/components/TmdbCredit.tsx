import Image from 'next/image'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'

// Logonun en-boy oranı (273.42 × 35.52) korunur; TMDB logoyu değiştirmeye izin vermiyor.
const LOGO_WIDTH = 108
const LOGO_HEIGHT = 14

export function TmdbCredit({ locale }: { locale: Locale }) {
  return (
    <div className="wrap mt-(--section-gap) flex items-center gap-4 border-t border-line pt-5 pb-6 text-xs text-muted">
      {/* unoptimized: yerel dosya TMDB görsel yükleyicisinden geçmemeli. */}
      <Image
        src="/tmdb-logo.svg"
        alt="TMDB"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        unoptimized
        className="flex-none"
      />
      <p>{messages[locale].credit}</p>
    </div>
  )
}
