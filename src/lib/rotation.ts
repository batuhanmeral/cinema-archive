export const ROTATION: readonly string[] = [
  'german-expressionism',
  'surrealist-cinema',
  'soviet-montage',
  'french-poetic-realism',
  'italian-neorealism',
  'french-new-wave',
  'cinema-novo',
  'czechoslovak-new-wave',
  'japanese-new-wave',
  'new-german-cinema',
  'new-hollywood',
  'iranian-new-wave',
  'hong-kong-new-wave',
  'new-taiwan-cinema',
  'dogme-95',
  'new-turkish-cinema',
  'new-french-extremity',
  'romanian-new-wave',
]

export const ROTATION_EPOCH_MS = Date.UTC(2026, 0, 4, 21)
export const WEEK_MS = 604_800_000

export function weekIndex(nowMs: number, count = ROTATION.length): number {
  const week = Math.floor((nowMs - ROTATION_EPOCH_MS) / WEEK_MS)
  return ((week % count) + count) % count
}

export function rotationSlot(slug: string): number {
  return ROTATION.indexOf(slug)
}

export function slotAttr(slot: number): string {
  return `w${slot}`
}
