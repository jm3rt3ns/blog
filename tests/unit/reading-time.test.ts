import { describe, it, expect } from 'vitest';
import { readingTime, countWords, WORDS_PER_MINUTE } from '@/lib/reading-time';

/** Build spec §10 — reading-time calculation. */

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

describe('countWords', () => {
  it('counts plain prose', () => {
    expect(countWords('one two three four five')).toBe(5);
  });

  it('collapses irregular whitespace', () => {
    expect(countWords('one   two\n\nthree\tfour')).toBe(4);
  });

  it('returns zero for empty content', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n  ')).toBe(0);
  });

  it('ignores fenced code blocks — listings are scanned, not read', () => {
    const content = ['one two three', '', '```ts', words(500), '```', '', 'four five'].join('\n');
    expect(countWords(content)).toBe(5);
  });

  it('counts inline code — it is read inline with the sentence', () => {
    expect(countWords('run `pnpm build` now')).toBe(4);
  });

  it('ignores rendered <pre> blocks', () => {
    expect(countWords(`<p>one two</p><pre><code>${words(300)}</code></pre>`)).toBe(2);
  });

  it('counts link text but not the URL', () => {
    expect(countWords('see [the build spec](https://example.com/a/very/long/path) now')).toBe(5);
  });

  it('does not count images', () => {
    expect(countWords('before ![a long alt description here](./img.jpg) after')).toBe(2);
  });

  it('strips HTML tags without gluing words together', () => {
    expect(countWords('<p>one</p><p>two</p>')).toBe(2);
  });
});

describe('readingTime', () => {
  it('rounds to whole minutes at 200 wpm', () => {
    expect(readingTime(words(WORDS_PER_MINUTE * 3)).minutes).toBe(3);
  });

  it('never reports less than one minute', () => {
    expect(readingTime('a few words').minutes).toBe(1);
    expect(readingTime('').minutes).toBe(1);
  });

  it('rounds to the nearest minute rather than truncating', () => {
    // 250 words is 1.25 minutes -> 1; 350 words is 1.75 -> 2.
    expect(readingTime(words(250)).minutes).toBe(1);
    expect(readingTime(words(350)).minutes).toBe(2);
  });

  it('exposes a display string', () => {
    expect(readingTime(words(600)).text).toBe('3 min read');
  });

  it('reports the underlying word count', () => {
    expect(readingTime(words(42)).words).toBe(42);
  });
});
