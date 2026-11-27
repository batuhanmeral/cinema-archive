import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMPTY_QUERY, type FilterKey } from '@/lib/archive-query'
import type { FacetOption } from '../select'
import { FilterBar } from './FilterBar'

const option = (value: string, label: string, count: number, selected = false): FacetOption => ({
  value,
  label,
  count,
  selected,
})
const facets: Record<FilterKey, FacetOption[]> = {
  genre: [option('18', 'Dram', 31), option('10749', 'Romantik', 12)],
  theme: [],
  country: [option('FR', 'Fransa', 48, true)],
  decade: [option('1960', "1960'lar", 48)],
  language: [],
}
const query = { ...EMPTY_QUERY, filters: { ...EMPTY_QUERY.filters, country: ['FR'] } }

function renderBar(onChange = vi.fn()) {
  render(
    <div>
      <p>outside</p>
      <FilterBar locale="tr" query={query} facets={facets} count={48} onChange={onChange} />
    </div>,
  )
  return onChange
}

const button = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

describe('FilterBar panels', () => {
  it('opens one panel at a time', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(button('Tür'))
    expect(button('Tür')).toHaveAttribute('aria-expanded', 'true')
    await user.click(button('Ülke'))
    expect(button('Tür')).toHaveAttribute('aria-expanded', 'false')
    expect(button('Ülke')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
  })

  it('closes on Esc and returns focus to its button', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(button('Tür'))
    await user.click(screen.getByRole('checkbox', { name: 'Dram 31' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(button('Tür')).toHaveFocus()
  })

  it('stays open while focus moves inside and closes when it leaves', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(button('Tür'))
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Dram 31' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('checkbox', { name: 'Romantik 12' })).toHaveFocus()
    await user.tab()
    expect(button('Tema')).toHaveFocus()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(button('Tür')).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on a click outside', async () => {
    const user = userEvent.setup()
    renderBar()
    await user.click(button('Yıl'))
    expect(screen.getByRole('checkbox', { name: "1960'lar 48" })).toBeInTheDocument()
    await user.click(screen.getByText('outside'))
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(button('Yıl')).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows counts in the labels and toggles a value', async () => {
    const user = userEvent.setup()
    const onChange = renderBar()
    await user.click(button('Tür'))
    const panel = screen.getByRole('group', { name: 'Tür' })
    expect(
      within(panel)
        .getAllByRole('checkbox')
        .map((c) => c.getAttribute('value')),
    ).toEqual(['18', '10749'])
    await user.click(screen.getByRole('checkbox', { name: 'Romantik 12' }))
    expect(onChange).toHaveBeenCalledWith({
      ...query,
      filters: { ...query.filters, genre: ['10749'] },
    })
  })

  it('shows the selected count in yellow on the filter button', () => {
    renderBar()
    const country = button('Ülke')
    expect(country).toHaveAccessibleName('Ülke 1')
    expect(within(country).getByText('1')).toHaveClass('text-accent')
    expect(button('Tür')).toHaveAccessibleName('Tür')
  })

  it('unchecks a selected value', async () => {
    const user = userEvent.setup()
    const onChange = renderBar()
    await user.click(button('Ülke'))
    const fr = screen.getByRole('checkbox', { name: 'Fransa 48' })
    expect(fr).toBeChecked()
    await user.click(fr)
    expect(onChange).toHaveBeenCalledWith(EMPTY_QUERY)
  })
})
