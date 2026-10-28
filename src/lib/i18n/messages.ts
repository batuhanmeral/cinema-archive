import type { SimilarReason } from '@/features/film/similar'
import type { Locale } from './locale'

type FilmIndexKey =
  | 'genre'
  | 'themes'
  | 'country'
  | 'language'
  | 'year'
  | 'runtime'
  | 'awards'
  | 'studio'
  | 'director'
  | 'writer'
  | 'producer'
  | 'cinematographer'
  | 'composer'

export type Messages = {
  credit: string
  nav: { home: string; switchLanguage: string }
  film: {
    sections: { trailer: string; cast: string; similar: string }
    playTrailer: string
    index: Record<FilmIndexKey, string>
    directorRole: string
    minutes: (n: number) => string
    similarReason: Record<SimilarReason, string>
  }
  rail: { previous: string; next: string }
}

export const messages: Record<Locale, Messages> = {
  tr: {
    credit:
      "Bu site TMDB API'sini kullanır, ancak TMDB tarafından onaylanmamış ya da desteklenmemiştir.",
    nav: { home: 'Ana sayfa', switchLanguage: 'İngilizce sürüme geç' },
    film: {
      sections: {
        trailer: 'Fragman ve kareler',
        cast: 'Yönetmen ve oyuncular',
        similar: 'Benzer filmler',
      },
      playTrailer: 'Fragmanı oynat',
      index: {
        genre: 'Tür',
        themes: 'Temalar',
        country: 'Ülke',
        language: 'Dil',
        year: 'Yıl',
        runtime: 'Süre',
        awards: 'Ödüller',
        studio: 'Stüdyo',
        director: 'Yönetmen',
        writer: 'Senaryo',
        producer: 'Yapımcı',
        cinematographer: 'Görüntü',
        composer: 'Müzik',
      },
      directorRole: 'Yönetmen',
      minutes: (n) => `${n} dk`,
      similarReason: {
        'same-director': 'Aynı yönetmen',
        'shared-tag': 'Ortak etiket',
        'genre-decade': 'Aynı tür ve dönem',
      },
    },
    rail: { previous: 'Önceki', next: 'Sonraki' },
  },
  en: {
    credit: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    nav: { home: 'Home', switchLanguage: 'Switch to Turkish' },
    film: {
      sections: {
        trailer: 'Trailer and stills',
        cast: 'Director and cast',
        similar: 'Similar films',
      },
      playTrailer: 'Play trailer',
      index: {
        genre: 'Genre',
        themes: 'Themes',
        country: 'Country',
        language: 'Language',
        year: 'Year',
        runtime: 'Runtime',
        awards: 'Awards',
        studio: 'Studio',
        director: 'Directed by',
        writer: 'Screenplay',
        producer: 'Producers',
        cinematographer: 'Cinematography',
        composer: 'Music',
      },
      directorRole: 'Director',
      minutes: (n) => `${n} min`,
      similarReason: {
        'same-director': 'Same director',
        'shared-tag': 'Shared tag',
        'genre-decade': 'Same genre and decade',
      },
    },
    rail: { previous: 'Previous', next: 'Next' },
  },
}
