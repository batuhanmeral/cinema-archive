// Tarayıcılar kaydırma konumunu küsuratlı verebilir; kenarda 1 px pay ok titremesini önler.
const EDGE_TOLERANCE = 1

export type ArrowSide = 'start' | 'end'
export type ArrowVisibility = Record<ArrowSide, boolean>

export function arrowVisibility(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
): ArrowVisibility {
  return {
    start: scrollLeft > EDGE_TOLERANCE,
    end: scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE,
  }
}

// Gizlenen ok odaktaysa odak <body>'ye düşmesin: karşı ok, o da gizliyse şerit alır.
export function focusAfterArrowChange(
  focused: ArrowSide | null,
  next: ArrowVisibility,
): ArrowSide | 'track' | null {
  if (!focused || next[focused]) return null
  const other: ArrowSide = focused === 'start' ? 'end' : 'start'
  return next[other] ? other : 'track'
}
