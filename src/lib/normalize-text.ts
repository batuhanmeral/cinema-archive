const SPECIAL: Record<string, string> = { ß: 'ss', ø: 'o', æ: 'ae', œ: 'oe', ł: 'l', đ: 'd' }

// Arama için metni küçük harfe, aksansız ve yalnızca [a-z0-9] kelimelere indirger.
export function normalizeText(text: string): string {
  return text
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[ßøæœłđ]/g, (ch) => SPECIAL[ch] ?? ch)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
