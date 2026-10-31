import { describe, expect, it } from 'vitest'
import {
  INITIAL_NAV_STATE,
  NAV_HEIGHT,
  initialNavState,
  nextNavState,
  type NavState,
} from './nav-state'

const HERO_BOTTOM = 800

function scrollThrough(ys: number[], heroBottom = HERO_BOTTOM): NavState {
  return ys.reduce((state, y) => nextNavState(state, y, heroBottom), INITIAL_NAV_STATE)
}

describe('nextNavState', () => {
  it('stays visible and transparent at the top', () => {
    const state = scrollThrough([0, 40, NAV_HEIGHT])
    expect(state.hidden).toBe(false)
    expect(state.solid).toBe(false)
  })
  it('hides when scrolling down past the navbar height', () => {
    expect(scrollThrough([40, NAV_HEIGHT + 1]).hidden).toBe(true)
  })
  it('returns after 24 px of upward travel, not before', () => {
    expect(scrollThrough([300, 500, 490, 481]).hidden).toBe(true)
    expect(scrollThrough([300, 500, 490, 476]).hidden).toBe(false)
  })
  it('hides again when scrolling down after returning', () => {
    expect(scrollThrough([300, 500, 470, 480]).hidden).toBe(true)
  })
  it('returns at the top even without enough upward travel', () => {
    expect(scrollThrough([60, 90]).hidden).toBe(true)
    expect(scrollThrough([60, 90, NAV_HEIGHT]).hidden).toBe(false)
  })
  it('turns solid when the hero has scrolled away', () => {
    expect(scrollThrough([HERO_BOTTOM - NAV_HEIGHT - 1]).solid).toBe(false)
    expect(scrollThrough([HERO_BOTTOM - NAV_HEIGHT]).solid).toBe(true)
  })
  it('is solid from the start on pages without a hero', () => {
    expect(scrollThrough([0], 0).solid).toBe(true)
  })
})

describe('initialNavState', () => {
  it('stays visible when the page opens mid-scroll', () => {
    const state = initialNavState(1500, HERO_BOTTOM)
    expect(state).toEqual({ hidden: false, solid: true, lastY: 1500, upTravel: 0 })
    expect(nextNavState(state, 1490, HERO_BOTTOM).hidden).toBe(false)
    expect(nextNavState(state, 1510, HERO_BOTTOM).hidden).toBe(true)
  })
  it('is transparent when the page opens at the top', () => {
    expect(initialNavState(0, HERO_BOTTOM)).toEqual(INITIAL_NAV_STATE)
  })
})
