/**
 * Date formatting (build spec §10).
 *
 * Everything renders in UTC. The site builds once and is served from the edge,
 * so a date formatted in the builder's local zone would silently shift a post
 * by a day depending on which machine ran the build.
 */

const LOCALE = 'en-US';

/** "12 March 2026" — the long form used in titleblocks and post headers. */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** "Mar 2026" — the compact form used in project date ranges. */
export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** `2026-03-12` — machine-readable, for `<time datetime>` and JSON-LD. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * A project's duration as it appears in the titleblock.
 * An absent `end` means ongoing (§4.2).
 */
export function formatDateRange(start: Date, end?: Date): string {
  const from = formatMonthYear(start);
  if (!end) return `${from} — ongoing`;
  const to = formatMonthYear(end);
  return from === to ? from : `${from} — ${to}`;
}

/**
 * Whether a post carries a meaningful revision.
 *
 * A same-day `updatedDate` is a typo fix, not a revision, and stamping a
 * revision line for it just adds noise to the header.
 */
export function hasRevision(pubDate: Date, updatedDate?: Date): boolean {
  if (!updatedDate) return false;
  return isoDate(updatedDate) > isoDate(pubDate);
}
