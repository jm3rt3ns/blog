# jackmertens.com

Personal site — long-form writing and a small set of project case studies.
Static Astro build, deployed to Cloudflare Pages.

Built to the spec in [`docs/build-spec.md`](docs/build-spec.md). Where the
implementation departs from it, the departure is recorded in
[`docs/decisions.md`](docs/decisions.md).

## Status

Phases 1 and 2 of the six-phase plan are implemented:

| Phase | Scope | State |
| --- | --- | --- |
| 1 | Skeleton — collections, schemas, routes, one real post and project | done |
| 2 | Design system — tokens, self-hosted fonts, titleblock, dark mode | done |
| 3 | Discoverability — RSS, sitemap, OG images, JSON-LD | not started |
| 4 | Comments — Giscus behind a swappable wrapper | not started |
| 5 | Newsletter — Buttondown form, two placements | not started |
| 6 | Polish — Pagefind, analytics, full Lighthouse pass | not started |

Nothing from phases 3–6 is stubbed. There is no dead form and no placeholder
comment widget; the spec is explicit that those ship when they ship.

## Commands

```sh
pnpm install
pnpm dev        # dev server — draft posts are visible here
pnpm build      # static build to dist/ — drafts excluded
pnpm preview    # serve the built output
pnpm check      # astro check (TypeScript, strict)
pnpm test       # vitest unit tests
pnpm check:links # broken links/anchors in dist/ — needs a build first
pnpm verify     # everything CI runs, in order
```

Node 22, pnpm.

## Structure

```
src/
  components/    Titleblock, PostCard, ProjectCard, Pagination, ThemeToggle
  layouts/       BaseLayout, PostLayout, ProjectLayout
  content/       posts/ and projects/ — markdown, the source of truth
  pages/         routes
  styles/        theme.css — every design token, in one @theme block
  lib/           pure helpers: collections, reading-time, format-date, tags, schemas
  content.config.ts
tests/unit/      vitest
scripts/         check-links.mjs
docs/
public/
  fonts/         self-hosted woff2, latin subset
  _headers       Cloudflare response headers
wrangler.jsonc   Cloudflare Workers static-assets config
.github/workflows/ci.yml
```

The helpers in `src/lib/` are deliberately pure — they take entries and return
entries, and never call `getCollection` themselves. That keeps every ordering
and visibility rule unit-testable, and keeps them free of anything that
assumes a build-time-only environment, so the SSR upgrade path stays open.

## Content

Posts and projects are markdown files validated by zod at build time. A
malformed frontmatter field fails the build rather than degrading silently.

`draft: true` posts render in `pnpm dev` and are excluded from `pnpm build`.

See [`docs/authoring.md`](docs/authoring.md) for the Obsidian workflow.

## Deployment

Cloudflare Workers with static assets, connected to the GitHub repo.
Production branch `main`, build command `pnpm build`, deploy command
`npx wrangler deploy`, Node 22. No GitHub secrets are involved — Cloudflare
authenticates through its GitHub App, and CI does not deploy.

`wrangler.jsonc` declares `dist/` as the asset directory, makes the edge
enforce trailing slashes, and serves the custom `404.html`. Only `main` builds;
there are no preview deployments.

Spec §11 says Pages, which is now in maintenance mode. See
[`docs/deployment.md`](docs/deployment.md) for the full setup runbook and
[`docs/decisions.md`](docs/decisions.md) for why Workers instead.

## Testing

`pnpm verify` runs the full gate — the same four steps CI runs.

105 unit tests cover schema validation, reading time, date formatting and the
`updatedDate > pubDate` invariant, tag normalization, draft exclusion, and the
content invariants (at most three featured projects, no duplicate slugs).

`pnpm check:links` checks the built `dist/` for broken internal links, broken
fragments, and missing trailing slashes.

The Playwright end-to-end suite, the axe-core pass and the Lighthouse CI
budgets described in the spec are not yet wired up. Neither is a linter.
