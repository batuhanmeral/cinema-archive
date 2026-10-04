# Sinema Arşivi — Next.js web

Load the `nextjs` skill before writing or reviewing code here. Next.js docs for the installed version: `node_modules/next/dist/docs/`.

## Stack

Next.js 16.4.3 (App Router, static export), React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4.3.3, Vitest 5.0.5 (+ Testing Library), Zod 4, Playwright (added in its task), pnpm 12.11.2, Node 24.

## Commands

- Dev: `pnpm dev`
- Tests: `pnpm test` · one test: `pnpm vitest run <file> -t "<name>"`
- E2E: `pnpm e2e`
- Lint and types: `pnpm lint` · `pnpm typecheck`
- Data import: `pnpm data:import`
- Env: copy `.env.example` to `.env.local`; validated in `src/lib/env.ts` (site) and `pipeline/env.ts` (import).

## Structure

Routes in `app/` stay thin; features in `src/features/<feature>/` (`components/`, `queries.ts`, `schemas.ts`); shared UI in `src/components/`; design tokens in `app/globals.css` (see `.docs/DESIGN.md`). `pipeline/` is the data import (run with tsx) and is never imported by the site. `data/` is generated and committed; `content/` is hand-written.
