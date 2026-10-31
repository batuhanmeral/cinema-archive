import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TmdbCredit } from './TmdbCredit'

const NOTICE = {
  tr: "Bu site TMDB API'sini kullanır, ancak TMDB tarafından onaylanmamış ya da desteklenmemiştir.",
  en: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
} as const

it.each(['tr', 'en'] as const)('shows the %s notice and the TMDB logo', (locale) => {
  render(<TmdbCredit locales={[locale]} />)
  expect(screen.getByText(NOTICE[locale])).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'TMDB' })).toBeInTheDocument()
})

it('shows both notices under one logo, each marked with its language', () => {
  render(<TmdbCredit locales={['tr', 'en']} />)
  expect(screen.getByText(NOTICE.tr)).toHaveAttribute('lang', 'tr')
  expect(screen.getByText(NOTICE.en)).toHaveAttribute('lang', 'en')
  expect(screen.getAllByRole('img', { name: 'TMDB' })).toHaveLength(1)
})
