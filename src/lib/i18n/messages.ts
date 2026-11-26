import type { FilterKey, SortKey } from '@/lib/archive-query'
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

type MovementIndexKey = 'years' | 'country' | 'pioneers' | 'faces' | 'cinematography'

export type SimilarReasonKey =
  'same-director' | 'same-movement' | 'same-collection' | 'shared-tag' | 'genre-decade'

export type Messages = {
  credit: string
  nav: {
    home: string
    switchLanguage: string
    movements: string
    collections: string
    menu: string
    skip: string
  }
  film: {
    sections: { trailer: string; cast: string; similar: string }
    playTrailer: string
    index: Record<FilmIndexKey, string>
    directorRole: string
    minutes: (n: number) => string
    similarReason: Record<SimilarReasonKey, string>
  }
  movement: {
    listTitle: string
    index: Record<MovementIndexKey, string>
    sections: { directors: string; films: string }
    previous: string
    next: string
    filmCount: (n: number) => string
    directorCount: (n: number) => string
  }
  collection: {
    listTitle: string
    columns: { number: string; film: string; director: string; genre: string; theme: string }
    others: string
    all: string
    filmCount: (n: number) => string
  }
  home: {
    sections: { movements: string; collections: string; archive: string; directors: string }
    all: { movements: string; collections: string; archive: string; directors: string }
    allShort: string
    notes: { current: string; next: string }
    swipe: string
    previousFilm: string
    nextFilm: string
  }
  rail: { previous: string; next: string }
  archive: {
    title: string
    description: string
    heroMeta: (stats: { films: number; from: number; to: number; countries: number }) => string
    filters: Record<FilterKey, string>
    resultCount: (n: number) => string
    sortLabel: string
    sort: Record<SortKey, string>
    clear: string
    removeChip: (label: string) => string
    showMore: string
    empty: string
    filterButton: (selected: number) => string
    close: string
  }
}

// Binlik ayırıcı dile göre: TR "3.128", EN "3,128".
const formatters = { tr: new Intl.NumberFormat('tr'), en: new Intl.NumberFormat('en') }
const count = (locale: Locale, n: number) => formatters[locale].format(n)

export const messages: Record<Locale, Messages> = {
  tr: {
    credit:
      "Bu site TMDB API'sini kullanır, ancak TMDB tarafından onaylanmamış ya da desteklenmemiştir.",
    nav: {
      home: 'Ana sayfa',
      switchLanguage: 'İngilizce sürüme geç',
      movements: 'Akımlar',
      collections: 'Koleksiyonlar',
      menu: 'Menü',
      skip: 'İçeriğe atla',
    },
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
        'same-movement': 'Aynı akım',
        'same-collection': 'Aynı koleksiyon',
        'shared-tag': 'Ortak etiket',
        'genre-decade': 'Aynı tür ve dönem',
      },
    },
    movement: {
      listTitle: 'Akımlar',
      index: {
        years: 'Yıllar',
        country: 'Ülke',
        pioneers: 'Öncüler',
        faces: 'Yüzleri',
        cinematography: 'Görüntü',
      },
      sections: { directors: 'Yönetmenler', films: 'Filmler' },
      previous: 'Önceki salon',
      next: 'Sonraki salon',
      filmCount: (n) => `${n} film`,
      directorCount: (n) => `${n} yönetmen`,
    },
    collection: {
      listTitle: 'Koleksiyonlar',
      columns: { number: 'Sıra', film: 'Film', director: 'Yönetmen', genre: 'Tür', theme: 'Tema' },
      others: 'Diğer koleksiyonlar',
      all: 'Tüm koleksiyonlar',
      filmCount: (n) => `${n} film`,
    },
    home: {
      sections: {
        movements: 'Akımlar',
        collections: 'Koleksiyonlar',
        archive: 'Film arşivi',
        directors: 'Yönetmenler',
      },
      all: {
        movements: 'Tüm akımlar',
        collections: 'Tüm koleksiyonlar',
        archive: 'Tüm filmler',
        directors: 'Tüm yönetmenler',
      },
      allShort: 'Tümü',
      notes: { current: 'Bu hafta perdede', next: 'Gelecek hafta' },
      swipe: 'Diğer filmler için kaydır',
      previousFilm: 'Önceki film',
      nextFilm: 'Sonraki film',
    },
    rail: { previous: 'Önceki', next: 'Sonraki' },
    archive: {
      title: 'Arşiv',
      description: 'Sitedeki bütün filmler. Türe, temaya, ülkeye, yıla ve dile göre süzebilirsin.',
      heroMeta: (s) => `${count('tr', s.films)} film · ${s.from}–${s.to} · ${s.countries} ülke`,
      filters: { genre: 'Tür', theme: 'Tema', country: 'Ülke', decade: 'Yıl', language: 'Dil' },
      resultCount: (n) => `${count('tr', n)} film`,
      sortLabel: 'Sırala',
      sort: {
        year: 'Yıl',
        'year-desc': 'Yıl (yeniden eskiye)',
        title: 'Ad',
        popular: 'Popülerlik',
        relevance: 'En uygun',
      },
      clear: 'Temizle',
      removeChip: (label) => `Kaldır: ${label}`,
      showMore: 'Daha fazla göster',
      empty: 'Bu seçimle eşleşen film yok.',
      filterButton: (n) => (n > 0 ? `Filtrele (${n})` : 'Filtrele'),
      close: 'Kapat',
    },
  },
  en: {
    credit: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    nav: {
      home: 'Home',
      switchLanguage: 'Switch to Turkish',
      movements: 'Movements',
      collections: 'Collections',
      menu: 'Menu',
      skip: 'Skip to content',
    },
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
        'same-movement': 'Same movement',
        'same-collection': 'Same collection',
        'shared-tag': 'Shared tag',
        'genre-decade': 'Same genre and decade',
      },
    },
    movement: {
      listTitle: 'Movements',
      index: {
        years: 'Years',
        country: 'Country',
        pioneers: 'Pioneers',
        faces: 'Faces',
        cinematography: 'Cinematography',
      },
      sections: { directors: 'Directors', films: 'Films' },
      previous: 'Previous hall',
      next: 'Next hall',
      filmCount: (n) => (n === 1 ? '1 film' : `${n} films`),
      directorCount: (n) => (n === 1 ? '1 director' : `${n} directors`),
    },
    collection: {
      listTitle: 'Collections',
      columns: {
        number: 'No.',
        film: 'Film',
        director: 'Director',
        genre: 'Genre',
        theme: 'Theme',
      },
      others: 'Other collections',
      all: 'All collections',
      filmCount: (n) => (n === 1 ? '1 film' : `${n} films`),
    },
    home: {
      sections: {
        movements: 'Movements',
        collections: 'Collections',
        archive: 'Film archive',
        directors: 'Directors',
      },
      all: {
        movements: 'All movements',
        collections: 'All collections',
        archive: 'All films',
        directors: 'All directors',
      },
      allShort: 'All',
      notes: { current: 'On screen this week', next: 'Next week' },
      swipe: 'Swipe for more films',
      previousFilm: 'Previous film',
      nextFilm: 'Next film',
    },
    rail: { previous: 'Previous', next: 'Next' },
    archive: {
      title: 'Archive',
      description: 'Every film on the site. Filter by genre, theme, country, year and language.',
      heroMeta: (s) =>
        `${count('en', s.films)} ${s.films === 1 ? 'film' : 'films'} · ${s.from}–${s.to} · ${s.countries} ${s.countries === 1 ? 'country' : 'countries'}`,
      filters: {
        genre: 'Genre',
        theme: 'Theme',
        country: 'Country',
        decade: 'Year',
        language: 'Language',
      },
      resultCount: (n) => `${count('en', n)} ${n === 1 ? 'film' : 'films'}`,
      sortLabel: 'Sort',
      sort: {
        year: 'Year',
        'year-desc': 'Year (newest first)',
        title: 'Title',
        popular: 'Popularity',
        relevance: 'Best match',
      },
      clear: 'Clear',
      removeChip: (label) => `Remove: ${label}`,
      showMore: 'Show more',
      empty: 'No films match this selection.',
      filterButton: (n) => (n > 0 ? `Filter (${n})` : 'Filter'),
      close: 'Close',
    },
  },
}
