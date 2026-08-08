/**
 * Tag normalization (build spec §4.1 — "lowercase, hyphenated").
 *
 * Tags are authored in Obsidian's properties UI, where they get typed as
 * whatever reads naturally: "Home Lab", "home lab", "Home-Lab". They are
 * normalized on the way in so `/writing/tags/home-lab/` is the only URL any
 * of those can produce.
 */

/**
 * Fold a freely-typed tag into its canonical lowercase-hyphenated form.
 *
 * Accents are folded to ASCII, runs of non-alphanumerics collapse to a single
 * hyphen, and leading/trailing hyphens are trimmed.
 */
export function normalizeTag(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining marks left by NFKD
    .toLowerCase()
    .replace(/['\u2019]/g, '') // possessives close up: "jack's" -> "jacks"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Human-facing form of a tag, for headings and chips.
 * Hyphens become spaces; the rest is left alone so the reader sees the tag as
 * it is spelled in the URL.
 */
export function tagLabel(tag: string): string {
  return tag.replace(/-/g, ' ');
}

/**
 * Collapse a list of raw tags to unique, normalized, sorted tags.
 * Empty results (a tag that was all punctuation) are dropped.
 */
export function normalizeTags(raw: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const tag of raw) {
    const normalized = normalizeTag(tag);
    if (normalized) seen.add(normalized);
  }
  return [...seen].sort();
}
