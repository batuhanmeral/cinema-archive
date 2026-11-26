import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RandomFilmButton } from './RandomFilmButton'

const nav = vi.hoisted(() => ({ pathname: '/film/stalker-1979', push: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push }),
}))

const loader = vi.hoisted(() => ({ slugs: vi.fn<() => Promise<string[]>>() }))
vi.mock('@/features/search/load', () => ({ loadFilmSlugs: loader.slugs }))

beforeEach(() => {
  nav.pathname = '/film/stalker-1979'
  nav.push.mockReset()
  loader.slugs.mockReset()
  loader.slugs.mockResolvedValue(['stalker-1979', 'solaris-1972', 'mirror-1975'])
})

describe('RandomFilmButton', () => {
  it('opens another film, never the current one', async () => {
    const random = vi.spyOn(Math, 'random')
    const user = userEvent.setup()
    render(<RandomFilmButton locale="tr" variant="bar" />)
    for (const value of [0, 0.5, 0.999]) {
      random.mockReturnValue(value)
      await user.click(screen.getByRole('button', { name: 'Rastgele film' }))
    }
    await waitFor(() => expect(nav.push).toHaveBeenCalledTimes(3))
    for (const [href] of nav.push.mock.calls) {
      expect(href).toMatch(/^\/film\/(solaris-1972|mirror-1975)$/)
    }
    random.mockRestore()
  })

  it('stays in the English site', async () => {
    nav.pathname = '/en'
    const user = userEvent.setup()
    render(<RandomFilmButton locale="en" variant="menu" />)
    await user.click(screen.getByRole('button', { name: 'Random film' }))
    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith(expect.stringMatching(/^\/en\/film\//)),
    )
  })

  it('does nothing when the list fails to load', async () => {
    loader.slugs.mockRejectedValueOnce(new Error('offline'))
    const user = userEvent.setup()
    render(<RandomFilmButton locale="tr" variant="bar" />)
    await user.click(screen.getByRole('button', { name: 'Rastgele film' }))
    await Promise.resolve()
    expect(nav.push).not.toHaveBeenCalled()
  })
})
