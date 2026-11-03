import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CollectionList } from './CollectionList'

const rows = [
  {
    number: 1,
    href: '/film/first-1963',
    posterPath: null,
    title: 'İlk',
    year: 1963,
    originalTitle: 'Il primo',
    overview: 'Bir özet.',
    directors: [{ text: 'Mario Bava', href: '/person/mario-bava', prefetch: false as const }],
    genres: [{ text: 'Gerilim', href: '/archive?genre=53', prefetch: false as const }],
    themes: [],
  },
]

describe('CollectionList', () => {
  it('links the row to the film by its title and keeps tag links separate', () => {
    render(<CollectionList rows={rows} locale="tr" />)
    const film = screen.getByRole('link', { name: /İlk/ })
    expect(film).toHaveAttribute('href', '/film/first-1963')
    const row = film.closest('li') as HTMLElement
    expect(within(row).getByRole('link', { name: 'Mario Bava' })).toHaveAttribute(
      'href',
      '/person/mario-bava',
    )
    expect(film).not.toContainElement(within(row).getByRole('link', { name: 'Gerilim' }))
    expect(row).toHaveTextContent('Il primo')
    expect(row).toHaveTextContent('1963')
  })

  it('labels the columns', () => {
    render(<CollectionList rows={rows} locale="en" />)
    for (const label of ['No.', 'Film', 'Director', 'Genre', 'Theme']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
