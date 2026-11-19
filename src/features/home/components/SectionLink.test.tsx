import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SectionLink } from './SectionLink'

describe('SectionLink', () => {
  it.each([
    { hiddenClass: 'md:hidden', visibleText: 'Tüm akımlar', name: 'Tüm akımlar' },
    { hiddenClass: 'md:inline', visibleText: 'Tümü', name: 'Tümü – Akımlar' },
  ])('starts its accessible name with $visibleText', ({ hiddenClass, visibleText, name }) => {
    render(
      <>
        <style>{`[class~="${hiddenClass}"] { display: none; }`}</style>
        <SectionLink
          href="/movements"
          label="Tüm akımlar"
          shortLabel="Tümü"
          sectionName="Akımlar"
        />
      </>,
    )
    expect(screen.getByText(visibleText)).toBeVisible()
    expect(screen.getByRole('link', { name })).toBeInTheDocument()
  })
})
