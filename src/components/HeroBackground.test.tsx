import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HeroBackground } from './HeroBackground'

describe('HeroBackground', () => {
  it('loads Perde images lazily with high priority while preserving existing preloads', () => {
    const { container, rerender } = render(
      <HeroBackground imagePath="/a.jpg" sizes="100vw" preload={false} />,
    )
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
    expect(container.querySelector('img')).toHaveAttribute('fetchpriority', 'high')
    rerender(<HeroBackground imagePath="/a.jpg" sizes="100vw" />)
    expect(container.querySelector('img')).not.toHaveAttribute('loading', 'lazy')
  })
})
