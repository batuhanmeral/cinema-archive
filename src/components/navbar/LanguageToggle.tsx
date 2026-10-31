'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { switchLocalePath } from '@/lib/i18n/routes'

function LanguageLink({ locale, path }: { locale: Locale; path: string }) {
  const other: Locale = locale === 'tr' ? 'en' : 'tr'
  // Diller ayrı kök layout'larda; geçiş zaten tam sayfa yüklemesi olduğundan düz <a> yeterli.
  return (
    <a
      href={switchLocalePath(path, other)}
      hrefLang={other}
      className="inline-flex h-8 min-w-10 items-center justify-center px-3 transition-colors duration-200 hover:bg-surface hover:text-accent"
    >
      {/* aria-label yerine: erişilebilir ad görünen "TR"/"EN" metnini de içermeli (WCAG 2.5.3). */}
      {`${locale.toUpperCase()} `}
      <span className="sr-only">{messages[locale].nav.switchLanguage}</span>
    </a>
  )
}

export function LanguageToggle({ locale }: { locale: Locale }) {
  const pathname = usePathname()
  const query = useSearchParams().toString()
  return <LanguageLink locale={locale} path={query ? `${pathname}?${query}` : pathname} />
}

// Statik çıktıda useSearchParams Suspense ister; o sırada sorgusuz bağlantı gösterilir.
export function LanguageToggleFallback({ locale }: { locale: Locale }) {
  return <LanguageLink locale={locale} path={usePathname()} />
}
