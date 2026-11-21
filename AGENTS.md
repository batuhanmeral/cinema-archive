<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Sinema Arşivi — Next.js web

Next.js docs for the installed version: `node_modules/next/dist/docs/`. Read the relevant guide before writing or reviewing code here.

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

`.github/workflows/security.yml` runs on PRs, pushes to `main`, weekly (Mon 05:00 UTC) and manually: `secrets` (gitleaks, full history, redacted), `sast` (Semgrep: `.semgrep/` custom rule + p/typescript, p/react, p/nextjs, p/github-actions, ERROR/WARNING block; then zizmor on the workflows, medium and up block), `dependencies` (Trivy on `pnpm-lock.yaml`, dev deps included, fixable CRITICAL/HIGH block), `dependency-review` (PRs only, high and up block), `sbom` (CycloneDX, not on PRs), `zap` (ZAP baseline on the static export served with the `serve.json` headers; FAIL rules in `security/zap-rules.tsv` block). `ci.yml` runs `check` and `e2e`. Actions are SHA-pinned; scanner images are pinned by tag and digest in the `env:` block of `security.yml` (Dependabot cannot update them; change tag and digest together). `.github/dependabot.yml` opens weekly grouped npm and Actions PRs with a 7-day cooldown. Vulnerability reports: `SECURITY.md`.

Local gates (same images and flags as CI; copy the image values from `security.yml`, `ZAP_IMAGE` from the `zap` job's `docker_name`):

- `docker run --rm -v "$PWD:/repo:ro" "$GITLEAKS_IMAGE" git /repo --redact --no-banner -v`
- `docker run --rm -v "$PWD:/src" -w /src "$SEMGREP_IMAGE" semgrep scan --config .semgrep --config p/typescript --config p/react --config p/nextjs --config p/github-actions --severity ERROR --severity WARNING --error --metrics=off`
- `GH_TOKEN="$(gh auth token)" zizmor --min-severity medium .github` (workflows and `dependabot.yml`)
- `docker run --rm -v "$PWD:/src:ro" -w /src "$TRIVY_IMAGE" fs --scanners vuln --include-dev-deps --severity CRITICAL,HIGH --ignore-unfixed --exit-code 1 .`
- `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:1.7.12@sha256:b1934ee5f1c509618f2508e6eb47ee0d3520686341fec936f3b79331f9315667`
- ZAP (after `pnpm build`, with `pnpm serve:out` running): `mkdir -p /tmp/zap && cp security/zap-rules.tsv /tmp/zap/ && docker run --rm --network=host -v /tmp/zap:/zap/wrk:rw "$ZAP_IMAGE" zap-baseline.py -t http://localhost:4173/movement/french-new-wave -c zap-rules.tsv -I`

Suppression rule: never silence a finding broadly. Gitleaks: a narrow allowlist (one path + one rule id) in `.gitleaks.toml`. Semgrep: `// nosemgrep: <rule-id>` on the line, with a Turkish comment giving the reason. Each suppression needs a one-line reason. Trivy: one CVE per line in `.trivyignore` with a comment and an `exp:YYYY-MM-DD` expiry; accepted advisories (owner decision only) must be listed in `.docs/ARCHITECTURE.md` Risks. zizmor: `# zizmor: ignore[<audit>]` on the line. ZAP `IGNORE` entries in `security/zap-rules.tsv` need a reason column.
