import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildHomeView } from '../view-model'
import { CollectionPicks } from './CollectionPicks'

describe('CollectionPicks', () => {
  it('renders six defaults with only the first two on mobile and responsive columns', () => {
    const view = buildHomeView('tr')
    render(<CollectionPicks initial={view.initialCollections} collections={view.collections} />)
    const list = screen.getByRole('list')
    expect(list).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'min-[900px]:grid-cols-3')
    const tiles = screen.getAllByRole('listitem')
    expect(tiles).toHaveLength(6)
    tiles.slice(2).forEach((tile) => expect(tile).toHaveClass('hidden', 'md:block'))
  })
})
