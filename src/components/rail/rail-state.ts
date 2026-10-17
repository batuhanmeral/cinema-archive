// Tarayıcılar kaydırma konumunu küsuratlı verebilir; kenarda 1 px pay ok titremesini önler.
const EDGE_TOLERANCE = 1

export function arrowVisibility(
  scrollLeft: number,
  clientWidth: number,
  scrollWidth: number,
): { start: boolean; end: boolean } {
  return {
    start: scrollLeft > EDGE_TOLERANCE,
    end: scrollLeft + clientWidth < scrollWidth - EDGE_TOLERANCE,
  }
}
