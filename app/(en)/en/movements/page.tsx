import type { Metadata } from 'next'
import { MovementsListPage } from '@/features/movement/MovementsListPage'
import { buildMovementsListMetadata } from '@/features/movement/metadata'
import { buildMovementStrips } from '@/features/movement/view-model'
import { store } from '@/lib/data'
import { getSiteEnv } from '@/lib/env'

export function generateMetadata(): Metadata {
  return buildMovementsListMetadata('en', getSiteEnv().siteUrl)
}

export default function Page() {
  const movements = store.movements()
  const strips = buildMovementStrips(movements, 'en', {
    films: store.filmById,
    people: store.people(),
    movements,
  })
  return <MovementsListPage locale="en" strips={strips} />
}
