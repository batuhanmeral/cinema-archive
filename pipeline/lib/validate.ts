import type { z } from 'zod'

export function parseOrThrow<T>(schema: z.ZodType<T>, path: string, data: unknown): T {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  // Yalnızca alan yolları yazılır; veri değerleri hata çıktısına girmez.
  const fields = [...new Set(result.error.issues.map((i) => i.path.join('.') || '(root)'))]
  throw new Error(`Invalid data in ${path}: ${fields.join(', ')}`)
}
