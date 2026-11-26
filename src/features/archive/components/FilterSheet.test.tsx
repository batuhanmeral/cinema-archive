import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_QUERY, type ArchiveQuery, type FilterKey } from '@/lib/archive-query'
import type { FacetOption } from '../select'
import { FilterBar } from './FilterBar'

const option = (value: string, label: string, count: number, selected = false): FacetOption => ({
  value,
  label,
  count,
  selected,
})
const facets: Record<FilterKey, FacetOption[]> = {
  genre: [option('18', 'Dram', 31, true), option('10749', 'Romantik', 12)],
  theme: [option('9748', 'İntikam', 4)],
  country: [option('FR', 'Fransa', 48, true)],
  decade: [option('1960', "1960'lar", 48, true)],
  language: [option('fr', 'Fransızca', 40)],
}
const selected: ArchiveQuery = {
  ...EMPTY_QUERY,
  filters: { ...EMPTY_QUERY.filters, genre: ['18'], country: ['FR'], decade: ['1960'] },
}

function renderBar(query: ArchiveQuery = selected, onChange = vi.fn()) {
  render(<FilterBar locale="tr" query={query} facets={facets} count={48} onChange={onChange} />)
  return onChange
}

const sheetButton = () => screen.getByRole('button', { name: /^Filtrele/ })

afterEach(() => {
  document.documentElement.style.overflow = ''
})

describe('FilterSheet (mobile)', () => {
  it('labels the button with the number of selected values', () => {
    renderBar(EMPTY_QUERY)
    expect(sheetButton()).toHaveAccessibleName('Filtrele')
  })

  it('counts every selected value across filters', () => {
    renderBar()
    expect(sheetButton()).toHaveAccessibleName('Filtrele (3)')
  })

  it('opens a modal dialog with focus inside and locks page scroll', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(sheetButton())
    const dialog = screen.getByRole('dialog', { name: 'Filtrele' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    expect(document.documentElement.style.overflow).toBe('hidden')
  })

  it('wraps Tab from the last control to the first and back', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(sheetButton())
    const dialog = screen.getByRole('dialog')
    const controls = within(dialog).getAllByRole('button')
    const first = controls[0]!
    const last = controls[controls.length - 1]!
    last.focus()
    await user.tab()
    expect(first).toHaveFocus()
    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('closes on Esc and returns focus to the button', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(sheetButton())
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(sheetButton()).toHaveFocus()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('closes with "Kapat" and returns focus to the button', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(sheetButton())
    await user.click(screen.getByRole('button', { name: 'Kapat' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(sheetButton()).toHaveFocus()
  })

  it('shows the five filters as disclosure sections with the desktop options', async () => {
    const user = userEvent.setup()
    const onChange = renderBar()
    await user.click(sheetButton())
    const dialog = screen.getByRole('dialog')
    const sections = ['Tür 1', 'Tema', 'Ülke 1', 'Yıl 1', 'Dil'].map((name) =>
      within(dialog).getByRole('button', { name }),
    )
    for (const section of sections) expect(section).toHaveAttribute('aria-expanded', 'false')
    expect(within(dialog).queryByRole('checkbox')).toBeNull()

    await user.click(sections[0]!)
    expect(sections[0]).toHaveAttribute('aria-expanded', 'true')
    const genre = within(dialog).getByRole('group', { name: 'Tür' })
    expect(within(genre).getByRole('checkbox', { name: 'Dram 31' })).toBeChecked()
    await user.click(within(genre).getByRole('checkbox', { name: 'Romantik 12' }))
    expect(onChange).toHaveBeenCalledWith({
      ...selected,
      filters: { ...selected.filters, genre: ['10749', '18'] },
    })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the live result count inside the sheet', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(sheetButton())
    expect(within(screen.getByRole('dialog')).getByText('48 film')).toBeInTheDocument()
  })

  it('cannot open while the controls are disabled', () => {
    render(<FilterBar locale="tr" query={EMPTY_QUERY} facets={null} count={3128} disabled />)
    expect(sheetButton()).toBeDisabled()
  })
})
