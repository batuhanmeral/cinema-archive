import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PortraitCard } from './PortraitCard'

describe('PortraitCard', () => {
  it('shows a person icon box and no image when the photo is missing', () => {
    const { container } = render(
      <PortraitCard name="François Truffaut" profilePath={null} note="4 film" />,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('4 film')).toBeInTheDocument()
  })

  it('links the name to the person page and shows the photo', () => {
    const { container } = render(
      <PortraitCard
        name="Jean-Luc Godard"
        href="/kisi/jean-luc-godard"
        profilePath="/godard.jpg"
        note="9 film"
      />,
    )
    expect(container.querySelector('img')).not.toBeNull()
    expect(screen.getByRole('link', { name: 'Jean-Luc Godard' })).toHaveAttribute(
      'href',
      '/kisi/jean-luc-godard',
    )
  })
})
