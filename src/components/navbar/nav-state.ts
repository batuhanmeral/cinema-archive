export type NavState = { hidden: boolean; solid: boolean; lastY: number; upTravel: number }

export const NAV_HEIGHT = 72
export const SHOW_AFTER_UP_PX = 24
export const INITIAL_NAV_STATE: NavState = { hidden: false, solid: false, lastY: 0, upTravel: 0 }

// Sayfa kaydırılmış konumda açılırsa (yenileme, geri) ilk ölçüm navbar'ı gizlememeli.
export function initialNavState(y: number, heroBottom: number): NavState {
  return { hidden: false, solid: y >= heroBottom - NAV_HEIGHT, lastY: y, upTravel: 0 }
}

// heroBottom: hero'nun alt kenarı; hero yoksa 0 verilir ve navbar baştan dolu görünür.
export function nextNavState(prev: NavState, y: number, heroBottom: number): NavState {
  const solid = y >= heroBottom - NAV_HEIGHT
  if (y <= NAV_HEIGHT) return { hidden: false, solid, lastY: y, upTravel: 0 }
  if (y > prev.lastY) return { hidden: true, solid, lastY: y, upTravel: 0 }
  const upTravel = prev.upTravel + (prev.lastY - y)
  const hidden = prev.hidden && upTravel < SHOW_AFTER_UP_PX
  return { hidden, solid, lastY: y, upTravel }
}
