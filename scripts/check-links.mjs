#!/usr/bin/env node
/**
 * Link check on the built output (build spec §10).
 *
 * Verifies that every internal link in `dist/` resolves to a file that exists,
 * that every fragment resolves to an `id` on the target page, and that every
 * internal path ends in a trailing slash (§5, `trailingSlash: 'always'`).
 *
 * Runs against `dist/`, so `pnpm build` has to come first.
 *
 * External links are not fetched. A link checker that hits the network is a
 * link checker that fails when someone else's server is down, which trains
 * everyone to ignore it.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const DIST = process.argv[2] ?? 'dist';

if (!existsSync(DIST)) {
  console.error(`${DIST}/ does not exist — run \`pnpm build\` first.`);
  process.exit(1);
}

/** Every .html file in the build, as paths relative to DIST. */
function htmlFiles(dir = DIST) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...htmlFiles(full));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

const pages = htmlFiles();

/** id attributes per page, so fragments can be resolved. */
const idsByFile = new Map(
  pages.map((file) => {
    const html = readFileSync(file, 'utf8');
    const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    return [file, ids];
  }),
);

/** The file a site-absolute path resolves to. */
function resolveTarget(pathname) {
  if (pathname.endsWith('/')) return path.join(DIST, pathname, 'index.html');
  if (path.extname(pathname)) return path.join(DIST, pathname);
  return null; // extensionless and unslashed — a trailing-slash violation
}

const problems = [];
let checked = 0;

for (const file of pages) {
  const source = path.relative(DIST, file);
  const html = readFileSync(file, 'utf8');

  for (const match of html.matchAll(/(?:href|src)="([^"]*)"/g)) {
    const raw = match[1];

    // Off-site, non-navigational, or template leftovers are not ours to check.
    if (!raw || /^(https?:|mailto:|tel:|data:|\/\/)/.test(raw)) continue;

    checked++;
    const [pathname, fragment] = raw.split('#');

    // A bare "#frag" points at the current page.
    if (pathname === '') {
      if (fragment && !idsByFile.get(file).has(fragment)) {
        problems.push(`${source}: no element with id "${fragment}" for "${raw}"`);
      }
      continue;
    }

    if (!pathname.startsWith('/')) {
      problems.push(`${source}: relative link "${raw}" — internal links must be site-absolute`);
      continue;
    }

    const target = resolveTarget(pathname);
    if (target === null) {
      problems.push(`${source}: "${raw}" is missing its trailing slash`);
      continue;
    }

    if (!existsSync(target)) {
      problems.push(`${source}: "${raw}" does not resolve to a built file`);
      continue;
    }

    if (fragment) {
      const ids = idsByFile.get(target);
      if (!ids) continue; // a non-HTML asset, nothing to anchor into
      if (!ids.has(fragment)) {
        problems.push(`${source}: no element with id "${fragment}" on ${pathname}`);
      }
    }
  }
}

for (const problem of problems) console.error(`  ${problem}`);

console.log(
  `${problems.length === 0 ? 'OK' : 'FAIL'} — ${checked} internal links across ${pages.length} pages, ${problems.length} problems`,
);

process.exit(problems.length === 0 ? 0 : 1);
