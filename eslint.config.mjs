import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'data/**',
    'next-env.d.ts',
    '.docs/**',
    '.superpowers/**',
    '.cache/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ]),
  // Biçimlendirme kurallarını Prettier'a bırakmak için en sonda olmalı.
  prettier,
])

export default eslintConfig
