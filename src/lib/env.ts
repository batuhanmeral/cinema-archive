import { z } from 'zod'

const siteEnvSchema = z.object({ SITE_URL: z.url() })

export type SiteEnv = { siteUrl: string }

export function parseSiteEnv(source: Record<string, string | undefined>): SiteEnv {
  const result = siteEnvSchema.safeParse(source)
  if (!result.success) {
    const names = Object.keys(z.flattenError(result.error).fieldErrors).join(', ')
    throw new Error(`Invalid environment variables: ${names}. See .env.example.`)
  }
  return { siteUrl: result.data.SITE_URL.replace(/\/+$/, '') }
}

let cached: SiteEnv | undefined

// Tembel ve önbellekli: modül yüklenirken değil, ilk kullanımda doğrulanır.
export function getSiteEnv(): SiteEnv {
  cached ??= parseSiteEnv(process.env)
  return cached
}
