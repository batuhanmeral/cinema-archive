import { render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { buildHomeView } from './view-model'
import { HomePage } from './HomePage'

vi.mock('next/link', () => ({
  default: ({ prefetch, children, ...props }: ComponentProps<'a'> & { prefetch?: boolean }) => (
    <a {...props} data-prefetch={prefetch === false ? 'off' : undefined}>
      {children}
    </a>
  ),
}))

describe('HomePage', () => {
  it.each(['tr', 'en'] as const)(
    'renders localized sections, defaults and destinations for %s',
    (locale) => {
      const { container } = render(
        <>
          <style>{'[class~="md:hidden"] { display: none; }'}</style>
          <HomePage view={buildHomeView(locale)} locale={locale} />
        </>,
      )
      const english = locale === 'en'
      const labels = english
        ? ['Movements', 'Collections', 'Film archive', 'Directors']
        : ['Akımlar', 'Koleksiyonlar', 'Film arşivi', 'Yönetmenler']
      expect(
        screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
      ).toEqual(labels)
      const full = english
        ? ['All movements', 'All collections', 'All films', 'All directors']
        : ['Tüm akımlar', 'Tüm koleksiyonlar', 'Tüm filmler', 'Tüm yönetmenler']
      for (const [i, slug] of ['movements', 'collections', 'archive', 'directors'].entries()) {
        const link = screen.getByRole('link', { name: full[i] })
        expect(link).toHaveAttribute('href', `${english ? '/en' : ''}/${slug}`)
        if (i >= 2) expect(link).toHaveAttribute('data-prefetch', 'off')
      }
      expect(
        within(screen.getByRole('region', { name: labels[2] })).getAllByRole('listitem'),
      ).toHaveLength(16)
      const directorRail = screen.getByRole('region', { name: labels[3] })
      expect(within(directorRail).getAllByRole('listitem')).toHaveLength(12)
      within(directorRail)
        .getAllByRole('link')
        .forEach((link) => expect(link).toHaveAttribute('data-prefetch', 'off'))
      expect(container.querySelector('main')?.lastElementChild).toHaveTextContent(
        english ? 'This product uses the TMDB API' : "Bu site TMDB API'sini kullanır",
      )
    },
  )
})
