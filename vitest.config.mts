import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

// Gerçek `server-only` paketi RSC dışında hata fırlatır; testlerde boş modüle yönlendirilir.
const serverOnlyStub = fileURLToPath(new URL('./vitest.empty.ts', import.meta.url))

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: { alias: { 'server-only': serverOnlyStub } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['pipeline/**/*.test.ts', 'src/**/*.test.ts', 'security/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
          setupFiles: ['vitest.setup.ts'],
        },
      },
    ],
  },
})
