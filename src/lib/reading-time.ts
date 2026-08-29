/**
 * Reading time (build spec §4.1).
 *
 * Computed at build time from the post's content — never stored in
 * frontmatter, so it cannot drift from the post it describes.
 *
 * The estimate is taken from the markdown body rather than the rendered HTML.
 * That keeps it dependency-free (no mdast walk, no extra remark plugin) and
 * counts exactly the words a reader reads, since markup never becomes prose.
 */

/** Words per minute. 200 is the conventional figure for adult prose. */
export const WORDS_PER_MINUTE = 200;

export interface ReadingTime {
  /** Whole minutes, floored at 1. */
  minutes: number;
  words: number;
  /** Display form, e.g. "6 min read". */
  text: string;
}

/**
 * Reduce markdown (or rendered HTML) to the words a reader actually reads.
 *
 * Code blocks are dropped before counting: a 40-line config listing is
 * scanned, not read, and counting it as prose inflates the estimate badly.
 * Inline code is kept, because it is read inline with the sentence around it.
 * Link and image syntax is unwrapped so URLs are not counted but link text is.
 */
export function toProse(content: string): string {
  return (
    content
      // fenced and indented code, then rendered code blocks
      .replace(/^```[\s\S]*?^```/gm, ' ')
      .replace(/^~~~[\s\S]*?^~~~/gm, ' ')
      .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      // inline code keeps its text — `pnpm build` is read, a listing is not
      .replace(/`([^`\n]*)`/g, '$1')
      // images contribute no reading time; links keep their text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // remaining markup and entities
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/gi, ' ')
      // heading, emphasis and quote punctuation
      .replace(/^[>#\-*+]+\s/gm, ' ')
      .replace(/[*_~]/g, '')
  );
}

export function countWords(content: string): number {
  const prose = toProse(content).trim();
  if (!prose) return 0;
  return prose.split(/\s+/).length;
}

/**
 * @param content The post's markdown body (`entry.body`).
 */
export function readingTime(content: string): ReadingTime {
  const words = countWords(content);
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return { minutes, words, text: `${minutes} min read` };
}
