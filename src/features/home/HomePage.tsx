import { FilmSection } from '@/components/FilmSection'
import { TmdbCredit } from '@/components/TmdbCredit'
import type { Locale } from '@/lib/i18n/locale'
import { messages } from '@/lib/i18n/messages'
import { archiveHref, collectionsHref, movementsHref } from '@/lib/i18n/routes'
import { ArchiveRail } from './components/ArchiveRail'
import { CollectionPicks } from './components/CollectionPicks'
import { DirectorRail } from './components/DirectorRail'
import { HomeStrips } from './components/HomeStrips'
import { Perde } from './components/Perde'
import { SectionLink } from './components/SectionLink'
import type { HomeView } from './view-model'

export function HomePage({ view, locale }: { view: HomeView; locale: Locale }) {
  const t = messages[locale].home
  return (
    <main id="content" tabIndex={-1} className="outline-none">
      <Perde frames={view.frames} buildWeek={view.buildWeek} locale={locale} />
      <FilmSection
        title={t.sections.movements}
        action={
          <SectionLink
            href={movementsHref(locale)}
            label={t.all.movements}
            shortLabel={t.allShort}
            sectionName={t.sections.movements}
          />
        }
      >
        <HomeStrips strips={view.strips} locale={locale} />
      </FilmSection>
      <FilmSection
        title={t.sections.collections}
        action={
          <SectionLink
            href={collectionsHref(locale)}
            label={t.all.collections}
            shortLabel={t.allShort}
            sectionName={t.sections.collections}
          />
        }
      >
        <CollectionPicks initial={view.initialCollections} collections={view.collections} />
      </FilmSection>
      <FilmSection
        title={t.sections.archive}
        action={
          <SectionLink
            href={archiveHref(locale, {})}
            label={t.all.archive}
            shortLabel={t.allShort}
            sectionName={t.sections.archive}
            prefetch={false}
          />
        }
      >
        <ArchiveRail initial={view.posters} url={view.postersUrl} locale={locale} />
      </FilmSection>
      <FilmSection
        title={t.sections.directors}
        action={
          <SectionLink
            href={`${locale === 'en' ? '/en' : ''}/directors`}
            label={t.all.directors}
            shortLabel={t.allShort}
            sectionName={t.sections.directors}
            prefetch={false}
          />
        }
      >
        <DirectorRail initial={view.directors} url={view.directorsUrl} locale={locale} />
      </FilmSection>
      <TmdbCredit locales={[locale]} />
    </main>
  )
}
