import { expect, it } from 'vitest'
import tmdbImageLoader from './tmdb-image-loader'

it.each([
  [100, 'w154'],
  [342, 'w342'],
  [640, 'w780'],
  [2000, 'original'],
])('%i → %s', (width, size) =>
  expect(tmdbImageLoader({ src: '/a.jpg', width })).toBe(
    `https://image.tmdb.org/t/p/${size}/a.jpg`,
  ),
)
