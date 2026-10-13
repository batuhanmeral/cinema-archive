'use client'

// TMDB'nin sunduğu hazır genişlikler; istenen genişliği karşılayan en küçüğü seçilir.
export const TMDB_WIDTHS = [92, 154, 185, 300, 342, 500, 780, 1280] as const

export default function tmdbImageLoader({ src, width }: { src: string; width: number }): string {
  const size = TMDB_WIDTHS.find((candidate) => candidate >= width)
  return `https://image.tmdb.org/t/p/${size ? `w${size}` : 'original'}${src}`
}
