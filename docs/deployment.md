# Deployment

Cloudflare Pages, connected to the GitHub repo, building on push. Build spec §11.

**No GitHub secrets are required.** Cloudflare's Git integration authenticates
through the Cloudflare GitHub App, which you authorize from the Cloudflare
dashboard. Nothing is stored in the repo, and the CI workflow does not deploy —
it only gates merges.

---

## Already done in the repo

| File | Purpose |
| --- | --- |
| `.node-version` | Pins Node 22 for both Cloudflare and CI |
| `public/_headers` | Security headers, immutable caching for `/_astro/` and `/fonts/` |
| `.github/workflows/ci.yml` | `astro check` → vitest → build → link check, on PRs and pushes to `main` |
| `scripts/check-links.mjs` | Verifies internal links, fragments and trailing slashes in `dist/` |

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
it. CI will run on the PR — it should be green.

Nothing deploys yet; the Pages project does not exist.

### 3. Create the Cloudflare Pages project

Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git** → authorize the Cloudflare GitHub App for `jm3rt3ns/blog`.

Build settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | `/` (leave blank) |

Environment variables: none needed. `.node-version` pins Node 22, and Pages
detects pnpm from `pnpm-lock.yaml`.

Save and deploy. The first build takes about two minutes and gives you a
`*.pages.dev` URL. **Open it and confirm the site renders before touching
DNS** — it is much easier to debug a build problem without a domain in the way.

### 4. Limit preview builds

This is the one that protects the free tier: 500 builds/month, and every push
to every branch builds a preview by default. The `claude/*` branches this repo
uses are exactly the chatty branch strategy §11 warns about.

Pages project → **Settings** → **Build** → **Branch control** →
**Preview branches** → **Custom branches**.

Pick one:

- **Include `preview/*`** (recommended) — nothing builds a preview unless you
  deliberately name a branch `preview/something`. Production still deploys on
  every push to `main`.
- **Exclude `*`** — no preview deployments at all. Leanest; you review changes
  locally with `pnpm build && pnpm preview`.

Cloudflare's Git integration cannot do "previews on pull requests only." If
per-PR preview URLs turn out to matter, the way to get them is to switch
deploys to GitHub Actions + `wrangler pages deploy`, which needs a
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in GitHub secrets. Not set
up here — noted so the option is visible if the tradeoff changes.

### 5. Point the apex domain

Pages project → **Custom domains** → **Set up a custom domain** →
`jackmertens.com` → **Activate domain**.

Because the zone is already on this Cloudflare account, Cloudflare creates the
DNS record for you — a proxied CNAME at the apex, flattened. You should not
need to add anything by hand.

**First delete any existing record at the apex.** An old `A`, `AAAA` or `CNAME`
on `jackmertens.com` from a previous host will block activation. Check
**DNS** → **Records** and remove conflicts before activating.

Certificate issuance takes a few minutes. The domain shows **Active** when it
is done.

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
- Then, under **Then...**, choose **Dynamic** rather than Static — a static
  redirect sends every URL to the homepage, while a dynamic one keeps the path:
  - Expression: `concat("https://jackmertens.com", http.request.uri.path)`
  - Status code: **301**
  - **Preserve query string**: on

Do not add `www.jackmertens.com` as a second custom domain on the Pages
project. That serves the site on both hostnames instead of redirecting, which
splits your canonical URLs.

### 7. Verify

```sh
# apex serves the site
curl -sI https://jackmertens.com/ | head -n 1

# www 301s to apex, path preserved
curl -sI https://www.jackmertens.com/writing/ | grep -iE '^(HTTP|location)'

# security headers are present
curl -sI https://jackmertens.com/ | grep -iE 'x-content-type|referrer-policy|x-frame'

# HTML revalidates (Pages' default; confirm it rather than assume)
curl -sI https://jackmertens.com/ | grep -i cache-control

# hashed assets are immutable
curl -sI "https://jackmertens.com/$(grep -o '/_astro/[^"]*\.css' dist/index.html | head -1)" | grep -i cache-control

# trailing-slash canonical is consistent
curl -s https://jackmertens.com/writing/spec-before-code/ | grep -o '<link rel="canonical"[^>]*>'
```

If the `Cache-Control` on HTML is not `max-age=0, must-revalidate`, add an
explicit rule to `public/_headers` — see the comment at the bottom of that file
for why it is deliberately absent.

---

## Optional, once it is live

- **HSTS** — SSL/TLS → Edge Certificates → **HTTP Strict Transport Security**.
  Turn it on only when you are sure the apex and `www` both serve HTTPS
  correctly; it is hard to walk back, since browsers cache the policy.
- **Always Use HTTPS** — SSL/TLS → Edge Certificates. Safe to enable now.
- **Cloudflare Web Analytics** — free, cookieless, no consent banner. This is
  a phase 6 item; it adds a script tag, and §9 forbids third-party scripts
  before user interaction, so it needs a deliberate decision rather than a
  checkbox.

---

## If the first build fails

The three likely causes, in order:

1. **pnpm version.** `package.json` pins `packageManager: pnpm@10.18.0`. If
   Pages' build image resolves a different one, remove that field and let
   Pages pick.
2. **`sharp`.** Astro's image pipeline needs it, and it is a direct dependency
   for exactly that reason. It ships prebuilt linux-x64 binaries, so it should
   need no compilation — but if the build log shows sharp failing to load, set
   the build system version to the latest under Settings → Build.
3. **Node version.** `.node-version` says `22`. If Pages ignores it, add an
   environment variable `NODE_VERSION` = `22` under Settings → Environment
   variables, for both Production and Preview.

Build logs are under the deployment in the Pages dashboard.
