# Sinema Arşivi — Next.js web

Load the `nextjs` skill before writing or reviewing code here. Next.js docs for the installed version: `node_modules/next/dist/docs/`.

## Stack

Next.js 16.4.3 (App Router, static export), React 19.3.0, TypeScript 5.9.3, Tailwind CSS 4.3.3, Vitest 5.0.5 (+ Testing Library), Zod 4, Playwright, pnpm 12.11.2, Node 24.

## Commands

- Dev: `pnpm dev`
- Tests: `pnpm test` · one test: `pnpm vitest run <file> -t "<name>"`
- E2E: `pnpm e2e` (serves `out/` via `pnpm serve:out`, so run `pnpm build` first)
- Lint and types: `pnpm lint` · `pnpm typecheck`
- Data import (list update; re-reads sources and rewrites `data/movements.json`/`data/collections.json`): `pnpm data:import` (reuses cached responses in `.cache/http` forever) · bypass the cache: `pnpm data:import --fresh`. The M6 monthly refresh must not use it as is (see ADR-005).
- Env: copy `.env.example` to `.env.local`; validated in `src/lib/env.ts` (site) and `pipeline/env.ts` (import).

## Structure

Routes in `app/` stay thin; features in `src/features/<feature>/` (`components/`, `queries.ts`, `schemas.ts`); shared UI in `src/components/`; design tokens in `app/globals.css` (see `.docs/DESIGN.md`). `pipeline/` is the data import (run with tsx) and is never imported by the site. `data/` is generated and committed; `content/` is hand-written.

## Security

`.github/workflows/security.yml` runs on PRs, pushes to `main`, weekly (Mon 05:00 UTC) and manually: `gitleaks` (full history), `semgrep` (`.semgrep/` custom rule + p/typescript, p/react, p/nextjs, p/github-actions; ERROR/WARNING block), `audit` (`pnpm audit --audit-level high`), `sbom` (CycloneDX, not on PRs), `zap` (ZAP baseline on the static export served with the `serve.json` headers; FAIL rules in `security/zap-rules.tsv` block). Actions are SHA-pinned; the Semgrep and ZAP images are pinned by digest.

Local gates (Docker):

- `docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:latest git /repo`
- `docker run --rm -v "$PWD:/src" -w /src semgrep/semgrep semgrep scan --config .semgrep --config p/typescript --config p/react --config p/nextjs --config p/github-actions --severity ERROR --severity WARNING --error --metrics=off`
- `pnpm audit --audit-level high`
- `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest`
- ZAP (after `pnpm build`, with `pnpm serve:out` running): `mkdir -p /tmp/zap && cp security/zap-rules.tsv /tmp/zap/ && docker run --rm --network=host -v /tmp/zap:/zap/wrk:rw ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://localhost:4173/movement/french-new-wave -c zap-rules.tsv -I`

Suppression rule: never silence a finding broadly. Gitleaks: a narrow allowlist (one path + one rule id) in `.gitleaks.toml`. Semgrep: `// nosemgrep: <rule-id>` on the line, with a Turkish comment giving the reason. Each suppression needs a one-line reason. Accepted `pnpm audit` advisories (no fixed version, owner decision only) must be listed in `.docs/ARCHITECTURE.md` Risks. ZAP `IGNORE` entries in `security/zap-rules.tsv` need a reason column.
