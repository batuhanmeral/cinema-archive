// NFKD bu harfleri ayrıştırmadığı için önceden elle eşlenir.
const SPECIAL_CHARS: Record<string, string> = {
  ı: 'i',
  İ: 'i',
  œ: 'oe',
  Œ: 'oe',
  æ: 'ae',
  Æ: 'ae',
  ß: 'ss',
  ø: 'o',
  Ø: 'o',
  ł: 'l',
  Ł: 'l',
  đ: 'd',
  Đ: 'd',
}

export function slugify(text: string): string {
  return text
    .replace(/[ıİœŒæÆßøØłŁđĐ]/g, (char) => SPECIAL_CHARS[char] ?? char)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function uniqueSlug(base: string, tmdbId: number, taken: ReadonlySet<string>): string {
  return taken.has(base) ? `${base}-${tmdbId}` : base
}

export function assignFilmSlug(
  input: { title: string; year: number; tmdbId: number },
  taken: ReadonlySet<string>,
): string {
  const base = `${slugify(input.title) || 'film'}-${input.year}`
  return uniqueSlug(base, input.tmdbId, taken)
}

export function assignPersonSlug(
  input: { name: string; tmdbId: number },
  taken: ReadonlySet<string>,
): string {
  const base = slugify(input.name) || `person-${input.tmdbId}`
  return uniqueSlug(base, input.tmdbId, taken)
}
