import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CollectionTile } from './CollectionTile'

describe('CollectionTile', () => {
  it('links the whole tile by its name and shows the film count', () => {
    render(
      <CollectionTile name="Giallo" href="/collection/giallo" meta="18 film" imagePath={null} />,
    )
    expect(screen.getByRole('link', { name: 'Giallo' })).toHaveAttribute(
      'href',
      '/collection/giallo',
    )
    expect(screen.getByText('18 film')).toBeInTheDocument()
  })
})
