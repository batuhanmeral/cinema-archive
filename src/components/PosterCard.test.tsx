import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PosterCard } from './PosterCard'

const props = { href: '/film/a', posterPath: '/a.jpg', title: 'A', caption: 'B, 1960' }

describe('PosterCard', () => {
  it('keeps the rail sizes by default and accepts grid sizes', () => {
    const { container, rerender } = render(<PosterCard {...props} />)
    expect(container.querySelector('img')).toHaveAttribute(
      'sizes',
      '(max-width: 767px) 120px, 156px',
    )
    rerender(<PosterCard {...props} sizes="50vw" />)
    expect(container.querySelector('img')).toHaveAttribute('sizes', '50vw')
  })
})
