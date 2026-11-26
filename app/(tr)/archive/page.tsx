import type { Metadata } from 'next'
import { ArchivePage } from '@/features/archive/ArchivePage'
import { buildArchiveMetadata } from '@/features/archive/metadata'
import { getSiteEnv } from '@/lib/env'

export function generateMetadata(): Metadata {
  return buildArchiveMetadata('tr', getSiteEnv().siteUrl)
}

export default function Page() {
  return <ArchivePage locale="tr" />
}
