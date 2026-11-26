// Bulunulan film dışındaki filmlerden eşit olasılıkla biri; başka film yoksa null.
export function pickRandomSlug(
  slugs: string[],
  current: string | null,
  random: () => number = Math.random,
): string | null {
  const others = current === null ? slugs : slugs.filter((slug) => slug !== current)
  if (others.length === 0) return null
  return others[Math.min(Math.floor(random() * others.length), others.length - 1)] ?? null
}

const FILM_PATH = /^(?:\/en)?\/film\/([^/]+)\/?$/

export function currentFilmSlug(pathname: string): string | null {
  return FILM_PATH.exec(pathname)?.[1] ?? null
}
