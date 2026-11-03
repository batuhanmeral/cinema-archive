import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MobileMenu } from './MobileMenu'

vi.mock('next/navigation', () => ({
  usePathname: () => '/film/x',
  useSearchParams: () => new URLSearchParams(),
}))

describe('MobileMenu', () => {
  it('opens on click and shows both section links', async () => {
    render(<MobileMenu locale="tr" />)
    const button = screen.getByRole('button', { name: 'Menü' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Akımlar' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Koleksiyonlar' })).toBeVisible()
  })

  it('closes on Escape and returns focus to the button', async () => {
    render(<MobileMenu locale="tr" />)
    const button = screen.getByRole('button', { name: 'Menü' })
    await userEvent.click(button)
    await userEvent.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('closes when a link is activated', async () => {
    render(<MobileMenu locale="tr" />)
    const button = screen.getByRole('button', { name: 'Menü' })
    await userEvent.click(button)
    await userEvent.click(screen.getByRole('link', { name: 'Akımlar' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })
})
