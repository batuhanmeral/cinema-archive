export function perdeStep(index: number, delta: -1 | 1, total: number): number {
  return (index + delta + total) % total
}

const SWIPE_DISTANCE = 40

export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) <= Math.abs(dy)) return 0
  return dx < 0 ? 1 : -1
}
