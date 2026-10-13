import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TmdbCredit } from './TmdbCredit'

it.each([
  [
    'tr',
    "Bu site TMDB API'sini kullanır, ancak TMDB tarafından onaylanmamış ya da desteklenmemiştir.",
  ],
  ['en', 'This product uses the TMDB API but is not endorsed or certified by TMDB.'],
] as const)('shows the %s notice and the TMDB logo', (locale, text) => {
  render(<TmdbCredit locale={locale} />)
  expect(screen.getByText(text)).toBeInTheDocument()
  expect(screen.getByRole('img', { name: 'TMDB' })).toBeInTheDocument()
})
