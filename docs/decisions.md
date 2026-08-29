# Decisions

Two lists: places where the implementation departs from the build spec, and the
questions the spec itself leaves open.

---

## Deviations from the spec

Each of these is a deliberate choice made during phases 1–2. Reversing any of
them is a small change; they are recorded so none of them is a surprise later.

### Newsreader ships without the optical-sizing axis

**Spec §6.2:** "Optical sizing on."

Google Fonts serves two variable cuts of Newsreader for the latin subset: one
carrying both `opsz` and `wght` (132 KB) and one carrying `wght` alone (58 KB).
The optical-sizing axis more than doubles the file.

Newsreader is used for body prose only, all of it at or near 17px, which is a
narrow enough size band that `opsz` has very little to do. Spending 74 KB
against a 250 KB total-page budget (§9) for an effect that mostly shows at
display sizes is a bad trade.

The 58 KB `wght`-only cut ships. If a future phase uses Newsreader at display
sizes, swap the file and add `font-optical-sizing: auto`.

### Dark mode defines four derived values, not one

**Spec §6.1** names the dark ground (`#12161B`), specifies vellum text, and
gives `--color-signal` a lightened value (`#6E93FF`). It does not give dark
values for `graphite`, `rule` or `mark`.

Those three are derived here to hold their contrast against the ink ground.
They are the same six roles, not new tokens — the token count in `@theme` is
still six.

### `@astrojs/rss` and `@astrojs/sitemap` are not installed

**Spec §3** lists both in the stack. Both belong to phase 3, and neither is
wired to anything yet. Rather than carry two unused dependencies through two
phases, they get installed when `/rss.xml` and the sitemap get built.

### Two extra modules in `src/lib/`

**Spec §13** lists `reading-time.ts`, `format-date.ts` and `collections.ts`.
This adds:

- `tags.ts` — tag normalization, which §10 requires tests for and which needed
  somewhere to live.
- `schemas.ts` — the zod schemas themselves. `content.config.ts` imports them
  and stays a thin binding. They live outside it because `astro:content` only
  resolves inside an Astro build, and the schema validation rules are exactly
  the part §10 wants unit-tested.

### `sharp` is a direct dependency

Not mentioned in the spec. Astro's image service needs it, and pnpm's strict
linking means a transitive copy is not resolvable from the project root. This
is what Astro's own docs prescribe.

### `yaml` is a dev dependency

Added so the content-invariant tests can read real frontmatter from
`src/content/` and run it through the production schemas. The alternative was
hand-rolling a YAML parser inside the test suite, which is worse. Dev-only —
it does not reach the browser.

### Reading time counts inline code

`\`pnpm build\`` is read as part of the sentence around it; a fenced code block
is scanned, not read. So fenced blocks and `<pre>` are dropped from the word
count and inline code is kept.

### The titleblock's hairlines are cell borders, not grid gaps

An implementation note rather than a design change. Drawing the rules as a
grid `gap` showing the container's background through is the obvious approach,
and it fails on a partial last row: the leftover cell renders as a solid block
of rule color. Each cell draws its own right and bottom hairline instead, and
the grid is inset one pixel past the container and clipped so the outer
borders do not double up. Any arrangement of spanning and non-spanning fields
now renders correctly.

### Preview deploys are branch-controlled, not per-pull-request

**Spec §11** asks for two things that cannot both hold: "Cloudflare Pages,
connected to the GitHub repo" with "Git integration", and "preview deploys on
PRs only — not on every branch push."

Cloudflare's Git integration builds on push and has no pull-request-scoped
mode. Its only lever is branch control: which branch patterns are eligible for
a preview build. So the choice was between the integration and the PR-only
rule, and the integration won — it needs no API token, no secrets in GitHub,
and no deploy logic in the repo.

The §11 concern behind the PR-only rule was burning the 500-builds/month free
tier on a chatty branch strategy. Branch control addresses that directly:
restricting previews to a `preview/*` prefix means the `claude/*` branches
never trigger a build. `docs/deployment.md` step 4 has the setting.

If per-PR preview URLs become genuinely useful, the alternative is GitHub
Actions running `wrangler pages deploy`, triggered on `pull_request` events.
That gives exact control and moves builds off Cloudflare's quota entirely, at
the cost of a `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub
secrets. Not built.

### CI runs four steps, not six

**Spec §11** specifies `astro check` → lint → vitest → build → playwright →
lighthouse-ci.

The workflow runs `astro check`, vitest, build, and the §10 link check. The
Playwright, axe-core and Lighthouse CI steps are absent because the suites they
would run do not exist yet; a workflow step that runs nothing is worse than no
step, because it reports green.

There is also **no linter**. Adding one is a real decision — ESLint with the
Astro and TypeScript plugins, or Prettier with `prettier-plugin-astro`, each
pulling several dependencies that §3 asks to be justified. `astro check` already
covers type correctness, which is the part that catches bugs. Formatting
consistency is currently maintained by hand.

### No Content-Security-Policy header

`public/_headers` sets the standard security headers but no CSP. The site uses
two small inline scripts — theme resolution in `<head>` and the toggle handler —
and a CSP permitting `'unsafe-inline'` for scripts gives up most of what a CSP
is for.

The real fix is hash-based CSP. Astro 5 can generate one via
`experimental.csp`, which hashes inline scripts and styles at build time.
Enabling an experimental flag during a deployment task was more risk than it
was worth, so this is deferred to phase 6, where it belongs with the rest of
the hardening pass. Phase 4 will need `frame-src` and `script-src` entries for
Giscus whenever it lands.

---

## Open questions

### From spec §15 — confirm before phase 4

- **Comment audience.** Giscus is the phase 4 default on the assumption that
  early readers are developers with GitHub accounts. If the audience is closer
  to small-business clients and church community, Remark42 is the right choice
  and phase 4 gets longer. Nothing about phase 1–2 forecloses either.
- **Portfolio framing.** `/work/` is built as client case studies with a
  titleblock. If the intent is nearer "things I've built for myself", `client`
  and `outcomes` become dead weight and the schema should shrink. The three
  scaffold projects deliberately include one personal, ongoing project to show
  how the block reads without a client.
- **Personal vs. agency identity.** The design reads as an individual
  practitioner. Agency branding would change phase 2's output, so say so before
  building on it.

### From spec §12 — wikilinks

Obsidian wikilinks are not supported and render as literal text. See
`docs/authoring.md` for the three options and the recommendation.

### Raised during implementation

- **The titleblock animates the top of the page.** §6.4's plot-in stagger
  starts fields at `opacity: 0`, and the titleblock sits high on post and
  project pages. With eight fields the last one lands around 580ms after load.
  That is unlikely to become the LCP element — the hero image below it is
  larger — but it is worth measuring against the §9 LCP budget during phase 6
  rather than assuming. If it does bite, the fix is to exclude the first row
  from the stagger.
- **All content is scaffolding.** The three projects and two published posts
  are placeholders written to exercise every schema field. The `/about/` page
  has no real bio and no contact address. All of it needs replacing before the
  domain points at this.
