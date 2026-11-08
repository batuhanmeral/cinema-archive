export function pickRandom<T>(items: readonly T[], count: number, random: () => number): T[] {
  const pool = [...items]
  const picked: T[] = []
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(random() * pool.length)
    picked.push(pool.splice(index, 1)[0]!)
  }
  return picked
}
