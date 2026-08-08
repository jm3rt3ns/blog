import { describe, it, expect } from 'vitest';
import { normalizeTag, normalizeTags, tagLabel } from '@/lib/tags';

/** Build spec §10 — tag normalization (case, whitespace, slug generation). */

describe('normalizeTag', () => {
  it('lowercases', () => {
    expect(normalizeTag('Astro')).toBe('astro');
  });

  it('hyphenates internal whitespace', () => {
    expect(normalizeTag('home lab')).toBe('home-lab');
  });

  it('collapses runs of whitespace into one hyphen', () => {
    expect(normalizeTag('test   driven   development')).toBe('test-driven-development');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeTag('  astro  ')).toBe('astro');
  });

  it('leaves an already-normalized tag untouched', () => {
    expect(normalizeTag('home-lab')).toBe('home-lab');
  });

  it('collapses repeated separators', () => {
    expect(normalizeTag('home -- lab')).toBe('home-lab');
    expect(normalizeTag('home/lab')).toBe('home-lab');
  });

  it('folds accents to ASCII', () => {
    expect(normalizeTag('Café')).toBe('cafe');
  });

  it('closes up apostrophes rather than splitting the word', () => {
    expect(normalizeTag("Jack's notes")).toBe('jacks-notes');
    expect(normalizeTag('Jack’s notes')).toBe('jacks-notes');
  });

  it('keeps digits', () => {
    expect(normalizeTag('Web 2.0')).toBe('web-2-0');
  });

  it('produces an empty string for a tag with no alphanumerics', () => {
    expect(normalizeTag('---')).toBe('');
    expect(normalizeTag('!!!')).toBe('');
  });

  it('maps every spelling of a tag onto one slug', () => {
    const spellings = ['Home Lab', 'home lab', 'Home-Lab', 'HOME  LAB', ' home-lab '];
    const slugs = new Set(spellings.map(normalizeTag));
    expect([...slugs]).toEqual(['home-lab']);
  });
});

describe('normalizeTags', () => {
  it('dedupes tags that normalize to the same slug', () => {
    expect(normalizeTags(['Astro', 'astro', 'ASTRO'])).toEqual(['astro']);
  });

  it('sorts alphabetically', () => {
    expect(normalizeTags(['web', 'astro', 'CSS'])).toEqual(['astro', 'css', 'web']);
  });

  it('drops tags that normalize to nothing', () => {
    expect(normalizeTags(['astro', '---', ''])).toEqual(['astro']);
  });

  it('returns an empty list for no tags', () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe('tagLabel', () => {
  it('renders a slug back as readable text', () => {
    expect(tagLabel('test-driven-development')).toBe('test driven development');
  });
});
