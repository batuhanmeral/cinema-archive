import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SkipLink } from './SkipLink'

describe('SkipLink', () => {
  it('points at #content and takes the first Tab', async () => {
    render(
      <>
        <SkipLink locale="en" />
        <a href="/x">other</a>
      </>,
    )
    await userEvent.tab()
    const link = screen.getByRole('link', { name: 'Skip to content' })
    expect(link).toHaveAttribute('href', '#content')
    expect(link).toHaveFocus()
  })
})
