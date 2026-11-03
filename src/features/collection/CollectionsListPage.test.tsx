import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CollectionsListPage } from './CollectionsListPage'

const tiles = [
  { name: 'Yavaş Sinema', href: '/collection/slow-cinema', meta: '12 film', imagePath: null },
  { name: 'Kült Korku', href: '/collection/cult-horror', meta: '30 film', imagePath: '/a.jpg' },
]

describe('CollectionsListPage', () => {
  it('shows the heading and one tile per collection with its film count', () => {
    render(<CollectionsListPage locale="tr" tiles={tiles} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Koleksiyonlar' })).toBeInTheDocument()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByRole('link')).toHaveAttribute('href', '/collection/slow-cinema')
    expect(within(items[0]!).getByText('12 film')).toBeInTheDocument()
  })

  it('uses the English heading', () => {
    render(<CollectionsListPage locale="en" tiles={tiles} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Collections' })).toBeInTheDocument()
  })
})
