# jackmertens.com — Build Spec

**Status:** Draft v1 — ready for implementation
**Target:** Static personal site (writing + project portfolio) on Astro, deployed to Cloudflare Pages
**Domain:** `jackmertens.com` (already owned, DNS on Cloudflare)

---

## 1. Goals

1. A fast, durable home for long-form writing and a small set of project case studies.
2. Content authored as markdown files in git, so the Obsidian vault can be the source of truth.
3. Readers can comment without the site needing a server.
4. Newsletter signup can be added without a rebuild of the architecture.
5. Hosting cost of $0/month at current traffic; nothing in the design that forces a paid tier later.

## 2. Non-goals

- No CMS, no admin UI, no database. Content is files.
- No user accounts, no paywalled content, no e-commerce.
- No blog-as-lead-magnet funnel apparatus. Signup lives in two places and nowhere else.
- No SSR in phase 1. The site builds to static HTML. (See §11 for the upgrade path.)

## 3. Stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Astro 5.x, `output: 'static'` | Content Layer API for collections |
| Language | TypeScript, `strict: true` | `astro check` gates CI |
| Styling | Tailwind v4 via `@tailwindcss/vite` | CSS-first config in `@theme`, no JS config file |
| Interactivity | `@astrojs/react` | Islands only; see §8 for the JS budget |
| Content | Markdown + MDX (`@astrojs/mdx`) | MDX only for posts needing components |
| Syntax highlighting | Shiki (Astro built-in) | Dual theme, no client JS |
| Feeds | `@astrojs/rss` | |
| Sitemap | `@astrojs/sitemap` | |
| Search | Pagefind | Phase 6; static index, no framework |
| Host | Cloudflare Pages | Git integration, preview deploys on PR |
| Package manager | pnpm | |

Do not add a state library, a UI component library, or an animation library. If a dependency is needed, justify it in the PR description.

## 4. Content model

Two collections. Schemas defined with zod in `src/content.config.ts` and validated at build time — a malformed frontmatter field must fail the build, not degrade silently.

### 4.1 `posts` — `src/content/posts/*.{md,mdx}`

```ts
{
  title: string,
  description: string,          // used for meta description + card text, 60–160 chars
  pubDate: date,
  updatedDate: date | undefined,
  tags: string[],               // lowercase, hyphenated; default []
  draft: boolean,               // default false
  heroImage: image | undefined,
  comments: boolean,            // default true; allows opting a post out
  canonicalUrl: string | undefined, // for cross-posted pieces
}
```

Slug comes from the filename. Reading time is computed at build time from the rendered content, not stored in frontmatter.

`draft: true` posts render in `dev` and are excluded from production builds.

### 4.2 `projects` — `src/content/projects/*.md`

The project schema is deliberately spec-sheet shaped — these fields render as a literal titleblock on the page (see §7).

```ts
{
  title: string,
  client: string | undefined,   // omit for personal projects
  summary: string,              // one sentence, used on index cards
  role: string,                 // e.g. "Architecture, build, handoff"
  stack: string[],
  startDate: date,
  endDate: date | undefined,    // absent means ongoing
  status: 'shipped' | 'in-progress' | 'archived',
  featured: boolean,            // default false; max 3 true at once — assert this in a test
  order: number,                // manual sort within index
  liveUrl: string | undefined,
  repoUrl: string | undefined,
  cover: image,
  outcomes: string[] | undefined, // 1–3 short result statements
}
```

## 5. Routes

| Path | Content |
|---|---|
| `/` | Intro, 3 featured projects, 5 most recent posts, one newsletter CTA |
| `/writing/` | Post index, paginated 10/page, newest first |
| `/writing/[slug]/` | Post detail |
| `/writing/tags/[tag]/` | Posts by tag, paginated |
| `/work/` | Project index, sorted by `order` then `startDate` desc |
| `/work/[slug]/` | Project case study |
| `/about/` | Bio, contact, what I do |
| `/rss.xml` | Full-content RSS for posts only |
| `/404` | Custom, with links to `/writing/` and `/work/` |
| `/og/[...slug].png` | Generated OG images — phase 3 |

Trailing slashes: `trailingSlash: 'always'`, consistent across links and canonical tags.

## 6. Design direction

The site's visual language is **engineering drawing** — drafting vellum, titleblocks, revision marks. This is grounded in how Jack actually works (spec-driven, TDD, substation/CAD adjacent) and it gives the project pages a structure that carries real information rather than decoration.

Follow this direction exactly. Do not substitute a warm-cream-and-serif treatment, a dark-mode-with-neon-accent treatment, or a broadsheet grid.

### 6.1 Color tokens

Define in `@theme`. Six values, no more.

```css
--color-vellum:   #EFEFE9;  /* page ground */
--color-ink:      #171C22;  /* body text, headings */
--color-graphite: #5A6470;  /* metadata, captions, secondary */
--color-rule:     #C9CCC2;  /* hairlines, titleblock borders */
--color-signal:   #1F4FD8;  /* links, active state — used sparingly */
--color-mark:     #B4331F;  /* revision/status marks only, never links */
```

Dark mode: invert to an ink ground (`#12161B`) with vellum text; `--color-signal` lightens to `#6E93FF` for contrast. Respect `prefers-color-scheme`, with a toggle that persists via a cookie (not localStorage — see §8, the toggle must work without hydration flash).

### 6.2 Typography

Three roles, self-hosted woff2, subset to Latin.

- **Display** — Archivo, weight 700, tight tracking (`-0.02em`). Headings and the site wordmark only.
- **Body** — Newsreader, weight 400/600. Post and page prose. Optical sizing on.
- **Utility** — IBM Plex Mono, weight 400/500. Dates, tags, titleblock fields, code, captions, nav.

Type scale: 1.25 ratio from a 17px base. Prose measure capped at 68ch.

Preload the display face only. Everything else `font-display: swap`.

### 6.3 Signature element — the titleblock

Every project page opens with a bordered metadata block modeled on an engineering drawing titleblock: a hairline-ruled grid of labeled fields drawn from the `projects` schema (client, role, stack, dates, status). Field labels in Plex Mono uppercase at 11px letterspaced; values in ink. `status` renders with a `--color-mark` stamp.

Post headers use a reduced version — two fields (date, reading time) plus revision line if `updatedDate` is set.

This is the one place to spend visual boldness. Everything else stays quiet: generous whitespace, hairline rules instead of boxes and shadows, no gradients, no card elevation, no border radius above 2px.

### 6.4 Motion

One orchestrated moment only: the titleblock fields draw in on page load with a 40ms stagger, as if being plotted. Nothing else animates except focus and hover states. Full `prefers-reduced-motion` respect — the stagger becomes an instant render, not a slower one.

## 7. Comments

Implement as a single `<Comments postSlug={...} />` Astro component that wraps the provider. **The provider must be swappable by editing one file.** This is the point of the abstraction — the phase 1 choice may not survive contact with the audience.

**Phase 1 provider: Giscus** (GitHub Discussions backed). Zero ops, free, no server. Its real limitation is that commenters need a GitHub account, which is fine for a developer readership and a hard wall for anyone else.

Requirements regardless of provider:

- Loads lazily on `IntersectionObserver`, never on initial page load.
- Renders a `<noscript>` fallback pointing at the discussion thread URL.
- Respects the post's `comments: false` frontmatter flag.
- Theme follows the site's light/dark state.
- Contributes 0 KB to the page's initial JS budget.

Document the swap procedure in `docs/comments.md`, with **Remark42** named as the intended alternative if the audience turns out to be non-technical. Remark42 would run on the homelab behind a Cloudflare Tunnel — the site itself stays on Cloudflare's edge, so a NAS reboot costs comments for ten minutes and nothing else.

## 8. Newsletter

**Phase 5. Do not build in phase 1.** No placeholder, no dead form.

When built: a `<NewsletterSignup />` component posting directly to Buttondown's hosted form endpoint. Plain HTML `<form>` with a native `action` — it must work with JS disabled. Progressive enhancement adds an inline success state and prevents the redirect.

- Endpoint URL from `PUBLIC_NEWSLETTER_ACTION` env var, not hardcoded.
- Exactly two placements: below the fold on `/`, and at the end of a post. Nowhere else. No modal, no exit-intent, no sticky bar.
- Honeypot field for spam. No captcha.

Buttondown's free tier covers 100 subscribers, which is the right size to validate whether the newsletter is a thing before paying for it.

## 9. Performance budget

These are **acceptance criteria enforced in CI**, not aspirations. A PR that breaks them fails.

| Metric | Budget | Measured on |
|---|---|---|
| Lighthouse Performance (mobile) | ≥ 98 | `/`, `/writing/[a post]/`, `/work/[a project]/` |
| Lighthouse Accessibility | 100 | same |
| LCP (Slow 4G, mobile throttle) | < 1.2s | same |
| CLS | < 0.02 | same |
| Initial JS, gzipped | < 15 KB | post page, excluding lazy comments |
| Total page weight | < 250 KB | post page with hero image |

Supporting rules:

- All images through `astro:assets`. AVIF with WebP fallback, explicit `width`/`height` on every image, `loading="lazy"` below the fold, `fetchpriority="high"` on LCP image.
- No web font blocks first paint.
- No third-party script loads before user interaction. This includes analytics.
- Dark mode toggle must not cause a flash — inline the theme-resolution script in `<head>`.

## 10. Testing

Test-first where it's meaningful. Don't write tests for Astro's own rendering.

**Vitest — unit**

- Content schema validation: valid frontmatter passes, each required-field omission fails, enum violations fail.
- Reading-time calculation.
- Date formatting and the `updatedDate > pubDate` invariant.
- Tag normalization (case, whitespace, slug generation).
- Assertion that at most 3 projects carry `featured: true`.
- Draft posts excluded from the production post list.

**Playwright — e2e, against the built output**

- Home renders featured projects and recent posts.
- A post page renders title, titleblock, prose, and comments container.
- Comments do not load until scrolled into view.
- Tag pages filter correctly; pagination links resolve.
- `/rss.xml` returns valid XML with the expected item count.
- 404 route renders.
- Dark mode toggle persists across navigation with no flash.
- Keyboard traversal: every interactive element reachable, focus ring visible.
- Zero console errors on every route.

**axe-core** in Playwright — zero `serious` or `critical` violations on all route templates.

**Link check** on the built `dist/` — no broken internal links, no broken anchors.

**Lighthouse CI** with §9 budgets as hard assertions.

## 11. Deployment

**Cloudflare Pages**, connected to the GitHub repo.

- Build command `pnpm build`, output `dist`, Node 22.
- Production branch `main`. Preview deploys on PRs only — **not on every branch push.** The free tier allows 500 builds/month; a chatty branch strategy will burn it.
- Custom domain: `jackmertens.com` apex, proxied. `www.jackmertens.com` handled by a Cloudflare Redirect Rule to apex (301), not a second Pages domain.
- Cloudflare Web Analytics (free, cookieless, no consent banner needed) — phase 6.

**GitHub Actions** on PR: `astro check` → lint → vitest → build → playwright → lighthouse-ci. All required to merge.

**Upgrade path if SSR is ever needed** (form handling, dynamic OG, a first-party comment API): add `@astrojs/cloudflare` and switch to `output: 'hybrid'`, opting individual routes into server rendering with `export const prerender = false`. Nothing in phase 1 should preclude this — in particular, don't do anything that assumes a build-time-only environment in shared utilities.

## 12. Content authoring workflow

Posts live in `src/content/posts/`. The intent is to sync a subfolder of the Obsidian vault into that directory so drafting happens in Obsidian.

- Frontmatter must be plain YAML compatible with Obsidian's properties UI.
- If wikilinks (`[[Note Name]]`) appear in content, they need a remark plugin to resolve or strip them — **flag this rather than silently rendering broken syntax.** Confirm with Jack whether he wants wikilink support before building it.
- Images referenced from posts go in `src/content/posts/_images/` so `astro:assets` can process them. Obsidian's default attachment folder will need to point there.

## 13. Repo structure

```
src/
  components/
    Comments.astro          # provider wrapper — swap point
    NewsletterSignup.astro  # phase 5
    Titleblock.astro        # the signature element
    PostCard.astro
    ProjectCard.astro
    ThemeToggle.astro
  layouts/
    BaseLayout.astro
    PostLayout.astro
    ProjectLayout.astro
  content/
    posts/
    projects/
  pages/
  styles/
    theme.css               # @theme tokens from §6
  lib/
    reading-time.ts
    format-date.ts
    collections.ts          # typed query helpers
content.config.ts
tests/
  unit/
  e2e/
docs/
  comments.md               # provider swap procedure
  authoring.md              # Obsidian workflow
```

## 14. Milestones

Ship each phase to production before starting the next. Getting the domain resolving to something real is worth more than getting it resolving to something finished.

1. **Skeleton** — Astro project, both collections with schemas, base layout, `/`, `/writing/`, `/work/`, `/about/`, one real post and one real project. Deployed to `jackmertens.com`. No design yet beyond legible defaults.
2. **Design system** — tokens from §6, three fonts self-hosted, titleblock component, post and project templates, dark mode. This is the phase where §6.3 gets real attention.
3. **Discoverability** — RSS, sitemap, canonical tags, Open Graph and Twitter meta, generated OG images, JSON-LD for posts.
4. **Comments** — Giscus behind the wrapper, lazy loading, `docs/comments.md`.
5. **Newsletter** — Buttondown form, two placements.
6. **Polish** — Pagefind search, Cloudflare Web Analytics, `prefers-reduced-motion` audit, full Lighthouse pass.

## 15. Decisions to confirm before phase 4

These are defaulted in this spec so implementation isn't blocked, but they're worth a real answer:

- **Comment audience.** Giscus is defaulted on the assumption that early readers are developers. If the site is aimed at small-business clients and church community, Remark42 should be the phase 4 choice instead and phase 4 gets longer.
- **Portfolio framing.** `/work/` is specced as client case studies with a titleblock. If the intent is closer to "things I've built for myself," the `client` and `outcomes` fields become dead weight and the schema should shrink.
- **Wikilinks.** See §12.
- **Personal vs. agency identity.** The current design direction reads as an individual practitioner. If this needs to carry agency branding, say so before phase 2.
