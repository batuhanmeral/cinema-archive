import { z } from 'zod'

const pipelineEnvSchema = z.object({
  TMDB_ACCESS_TOKEN: z.string().min(1),
  SITE_URL: z.url(),
})

export type PipelineEnv = { tmdbAccessToken: string; siteUrl: string }

export function loadPipelineEnv(source: Record<string, string | undefined>): PipelineEnv {
  const result = pipelineEnvSchema.safeParse(source)
  if (!result.success) {
    // Hata mesajına yalnızca değişken adları girer; değerler (token) asla sızmaz.
    const names = Object.keys(z.flattenError(result.error).fieldErrors).join(', ')
    throw new Error(`Invalid environment variables: ${names}. See .env.example.`)
  }
  return {
    tmdbAccessToken: result.data.TMDB_ACCESS_TOKEN,
    siteUrl: result.data.SITE_URL.replace(/\/+$/, ''),
  }
}
