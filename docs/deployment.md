# Deployment

Cloudflare **Workers with static assets**, connected to the GitHub repo,
building on push. Build spec §11.

**No GitHub secrets are required.** Cloudflare authenticates through its GitHub
App, which you authorize from the Cloudflare dashboard. Nothing is stored in
the repo, and the CI workflow does not deploy — it only gates merges.

## Why Workers rather than Pages

§11 says "Cloudflare Pages." Cloudflare has since put Pages into maintenance
mode — still supported and still receiving bug fixes, but all new investment
goes to Workers, and the dashboard now routes new projects into the Workers
flow by default.

Workers with static assets serves `dist/` from the same edge, keeps static
asset requests free, and supports the same `_headers` file. It also makes §11's
own SSR upgrade path shorter: `@astrojs/cloudflare` targets Workers, so adding
a server-rendered route later means adding an adapter, not migrating platforms.

The one visible difference is that there is no "build output directory" field
in the setup form. That is what `wrangler.jsonc` is for.

---

## Already done in the repo

| File | Purpose |
| --- | --- |
| `wrangler.jsonc` | Declares `dist/` as the asset directory, forces trailing slashes, serves `404.html` |
| `.node-version` | Pins Node 22 for both Cloudflare and CI |
| `public/_headers` | Security headers, immutable caching for `/_astro/` and `/fonts/` |
| `.github/workflows/ci.yml` | `astro check` → vitest → build → link check, on PRs and pushes to `main` |
| `scripts/check-links.mjs` | Verifies internal links, fragments and trailing slashes in `dist/` |

`wrangler` is a pinned dev dependency, so `npx wrangler deploy` uses the
version in the lockfile rather than whatever is newest on the day of the build.

`pnpm verify` runs the whole gate locally, exactly as CI does.

---

## Your checklist

### 1. Rename `master` → `main`

GitHub → repo **Settings** → **General** → **Default branch** → the pencil icon
→ rename `master` to `main`.

GitHub retargets open pull requests and redirects existing clones. Do this
*before* merging the scaffold branch, so the merge lands on `main`.

Then locally:

```sh
git fetch origin
git branch -m master main 2>/dev/null || true
git branch -u origin/main main 2>/dev/null || true
```

### 2. Merge the scaffold branch

Open a PR from `claude/jackmertens-site-scaffold-40p7ua` into `main` and merge
it. CI runs on the PR and should be green.

Nothing deploys yet; the Worker does not exist.

### 3. Create the Worker

Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a
repository** → authorize the Cloudflare GitHub App for `jm3rt3ns/blog`.

This is the form in your screenshot. Fill it in as:

| Field | Value |
| --- | --- |
| Project name | `website` |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` — the default, and correct |
| Builds for non-production branches | **unchecked** (see step 4) |

**`npx wrangler deploy` is the right deploy command,** and there is no output
directory field because `wrangler.jsonc` already declares it:

```jsonc
"assets": {
  "directory": "./dist",
  "html_handling": "force-trailing-slash",
  "not_found_handling": "404-page"
}
```

That config also does two jobs the Pages form would not have:
`force-trailing-slash` makes the edge 301 `/writing` onto `/writing/`, matching
the site's `trailingSlash: 'always'`; and `not_found_handling` serves the
custom `dist/404.html` instead of Cloudflare's default error page.

> **The project name must match `name` in `wrangler.jsonc`.** It is currently
> `website`, matching your screenshot. If you name the project something else,
> change that field too, or `wrangler deploy` will deploy to a second Worker
> under the old name.

Under **Advanced settings**, confirm the production branch is `main`.

Save and deploy. The first build takes a couple of minutes and gives you a
`website.<your-subdomain>.workers.dev` URL. **Open it and confirm the site
renders before touching DNS** — much easier to debug a build without a domain
in the way.

### 4. Turn off non-production branch builds

This is the one that protects the free tier. Unchecking **"Builds for
non-production branches"** means only pushes to `main` build, so the `claude/*`
branches this repo uses never trigger one. That is §11's "not on every branch
push," achieved with a checkbox rather than branch patterns.

The tradeoff is no preview URLs. Review changes locally with
`pnpm build && pnpm preview`, or turn the checkbox back on temporarily when a
change genuinely needs a shared preview link.

If you later want per-PR previews specifically, that needs GitHub Actions
running `wrangler versions upload` on `pull_request` events, which does require
a `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub secrets. Not set
up here.

### 5. Point the apex domain

Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain** →
`jackmertens.com`.

Because the zone is already on this Cloudflare account, Cloudflare creates the
DNS record and provisions the certificate for you. You should not need to add
anything by hand.

**First delete any existing record at the apex.** An old `A`, `AAAA` or `CNAME`
on `jackmertens.com` from a previous host will block it. Check **DNS** →
**Records** and remove conflicts before adding the custom domain.

Certificate issuance takes a few minutes.

### 6. Redirect `www` to the apex

Two parts, and the first is the one people miss: a redirect rule only fires on
traffic that actually reaches Cloudflare, so `www` needs a proxied DNS record
to exist at all.

**DNS** → **Records** → **Add record**:

| Field | Value |
| --- | --- |
| Type | `CNAME` |
| Name | `www` |
| Target | `jackmertens.com` |
| Proxy status | **Proxied** (orange cloud) |

Then **Rules** → **Redirect Rules** → **Create rule**:

- Name: `www to apex`
- When incoming requests match: **Custom filter expression** →
  Field `Hostname`, Operator `equals`, Value `www.jackmertens.com`
- Under **Then...**, choose **Dynamic** rather than Static — a static redirect
  sends every URL to the homepage, while a dynamic one keeps the path:
  - Expression: `concat("https://jackmertens.com", http.request.uri.path)`
  - Status code: **301**
  - **Preserve query string**: on

Do not add `www.jackmertens.com` as a second custom domain on the Worker. That
serves the site on both hostnames instead of redirecting, which splits your
canonical URLs.

### 7. Verify

```sh
# apex serves the site
curl -sI https://jackmertens.com/ | head -n 1

# www 301s to apex, path preserved
curl -sI https://www.jackmertens.com/writing/ | grep -iE '^(HTTP|location)'

# the edge enforces trailing slashes
curl -sI https://jackmertens.com/writing | grep -iE '^(HTTP|location)'

# the custom 404 is served, not Cloudflare's
curl -s https://jackmertens.com/no-such-page/ | grep -o '<title>[^<]*</title>'

# security headers are present
curl -sI https://jackmertens.com/ | grep -iE 'x-content-type|referrer-policy|x-frame'

# HTML revalidates (the platform default; confirm rather than assume)
curl -sI https://jackmertens.com/ | grep -i cache-control

# hashed assets are immutable
curl -sI "https://jackmertens.com$(grep -o '/_astro/[^"]*\.css' dist/index.html | head -1)" | grep -i cache-control

# trailing-slash canonical is consistent
curl -s https://jackmertens.com/writing/spec-before-code/ | grep -o '<link rel="canonical"[^>]*>'
```

If `Cache-Control` on HTML is not `max-age=0, must-revalidate`, add an explicit
rule to `public/_headers` — the comment at the bottom of that file explains why
it is deliberately absent.

---

## Deploying by hand

Normally you never need this; pushing to `main` is the deploy. But if the Git
integration is down or you need to ship without a commit:

```sh
pnpm build
npx wrangler deploy          # requires `npx wrangler login` once
```

`pnpm deploy:dry` runs the upload path without shipping anything, which is the
fast way to check that a `wrangler.jsonc` edit is valid.

---

## Optional, once it is live

- **HSTS** — SSL/TLS → Edge Certificates → **HTTP Strict Transport Security**.
  Turn it on only when you are sure the apex and `www` both serve HTTPS
  correctly; browsers cache the policy, so it is hard to walk back.
- **Always Use HTTPS** — SSL/TLS → Edge Certificates. Safe to enable now.
- **Cloudflare Web Analytics** — free, cookieless, no consent banner. A phase 6
  item: it adds a script tag, and §9 forbids third-party scripts before user
  interaction, so it needs a deliberate decision rather than a checkbox.

---

## If the first build fails

The likely causes, in order:

1. **Name mismatch.** If `name` in `wrangler.jsonc` does not match the project
   name, the build succeeds and deploys somewhere you are not looking.
2. **pnpm version.** `package.json` pins `packageManager: pnpm@10.18.0`. If
   Cloudflare's build image resolves a different one, remove that field.
3. **`sharp`.** Astro's image pipeline needs it, and it is a direct dependency
   for that reason. It ships prebuilt linux-x64 binaries and should need no
   compilation; if the log shows it failing to load, check the build image's
   Node version.
4. **Node version.** `.node-version` says `22`. If Cloudflare ignores it, add
   an environment variable `NODE_VERSION` = `22` in the Worker's build settings.

Build logs are under the deployment in the dashboard.
