import { describe, it, expect } from 'vitest';
import {
  publishedPosts,
  recentPosts,
  isVisible,
  allTags,
  postsByTag,
  tagCounts,
  sortedProjects,
  featuredProjects,
  countFeatured,
  type Post,
  type Project,
} from '@/lib/collections';

/**
 * Build spec §10 — draft exclusion, ordering, and the index queries.
 *
 * The helpers are pure, so the fixtures here are the minimum shape each one
 * reads rather than full collection entries.
 */

const post = (
  id: string,
  pubDate: string,
  options: { draft?: boolean; tags?: string[] } = {},
): Post =>
  ({
    id,
    data: {
      pubDate: new Date(`${pubDate}T00:00:00Z`),
      draft: options.draft ?? false,
      tags: options.tags ?? [],
    },
  }) as unknown as Post;

const project = (
  id: string,
  order: number,
  startDate: string,
  featured = false,
): Project =>
  ({
    id,
    data: { order, startDate: new Date(`${startDate}T00:00:00Z`), featured },
  }) as unknown as Project;

const IS_DEV = true;
const IS_PROD = false;

describe('isVisible', () => {
  it('shows published posts in both environments', () => {
    const published = post('a', '2026-01-01');
    expect(isVisible(published, IS_DEV)).toBe(true);
    expect(isVisible(published, IS_PROD)).toBe(true);
  });

  it('shows drafts in dev and hides them in production', () => {
    const draft = post('b', '2026-01-01', { draft: true });
    expect(isVisible(draft, IS_DEV)).toBe(true);
    expect(isVisible(draft, IS_PROD)).toBe(false);
  });
});

describe('publishedPosts', () => {
  const posts = [
    post('older', '2026-01-01'),
    post('newest', '2026-03-01'),
    post('draft', '2026-04-01', { draft: true }),
    post('middle', '2026-02-01'),
  ];

  it('excludes drafts from a production build', () => {
    expect(publishedPosts(posts, IS_PROD).map((p) => p.id)).toEqual([
      'newest',
      'middle',
      'older',
    ]);
  });

  it('includes drafts in dev', () => {
    expect(publishedPosts(posts, IS_DEV).map((p) => p.id)).toEqual([
      'draft',
      'newest',
      'middle',
      'older',
    ]);
  });

  it('sorts newest first', () => {
    const dates = publishedPosts(posts, IS_PROD).map((p) => p.data.pubDate.getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it('does not mutate the input', () => {
    const input = [...posts];
    publishedPosts(input, IS_PROD);
    expect(input.map((p) => p.id)).toEqual(posts.map((p) => p.id));
  });
});

describe('recentPosts', () => {
  const posts = Array.from({ length: 8 }, (_, i) =>
    post(`p${i}`, `2026-01-0${i + 1}`.slice(0, 10)),
  );

  it('returns the five most recent by default', () => {
    expect(recentPosts(posts, IS_PROD)).toHaveLength(5);
  });

  it('returns them newest first', () => {
    expect(recentPosts(posts, IS_PROD)[0]!.id).toBe('p7');
  });

  it('returns everything when there are fewer than the limit', () => {
    expect(recentPosts(posts.slice(0, 2), IS_PROD)).toHaveLength(2);
  });
});

describe('tag queries', () => {
  const posts = [
    post('a', '2026-03-01', { tags: ['astro', 'web'] }),
    post('b', '2026-02-01', { tags: ['astro'] }),
    post('c', '2026-01-01', { tags: ['css'], draft: true }),
  ];

  it('lists every tag in use, alphabetically', () => {
    expect(allTags(posts, IS_PROD)).toEqual(['astro', 'web']);
  });

  it('does not surface tags that only appear on drafts in production', () => {
    expect(allTags(posts, IS_PROD)).not.toContain('css');
    expect(allTags(posts, IS_DEV)).toContain('css');
  });

  it('filters posts by tag, newest first', () => {
    expect(postsByTag(posts, IS_PROD, 'astro').map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('returns nothing for an unused tag', () => {
    expect(postsByTag(posts, IS_PROD, 'nope')).toEqual([]);
  });

  it('counts posts per tag', () => {
    const counts = tagCounts(posts, IS_PROD);
    expect(counts.get('astro')).toBe(2);
    expect(counts.get('web')).toBe(1);
    expect(counts.has('css')).toBe(false);
  });
});

describe('project ordering', () => {
  const projects = [
    project('third', 3, '2024-01-01'),
    project('first', 1, '2025-01-01'),
    project('second-b', 2, '2023-01-01'),
    project('second-a', 2, '2025-06-01'),
  ];

  it('sorts by manual order, then most recent start', () => {
    expect(sortedProjects(projects).map((p) => p.id)).toEqual([
      'first',
      'second-a',
      'second-b',
      'third',
    ]);
  });

  it('does not mutate the input', () => {
    const input = [...projects];
    sortedProjects(input);
    expect(input.map((p) => p.id)).toEqual(projects.map((p) => p.id));
  });
});

describe('featuredProjects', () => {
  it('returns only featured projects, in index order', () => {
    const projects = [
      project('b', 2, '2025-01-01', true),
      project('a', 1, '2025-01-01', true),
      project('plain', 3, '2025-01-01', false),
    ];
    expect(featuredProjects(projects).map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('caps the home page at three even if the content says otherwise', () => {
    const projects = Array.from({ length: 5 }, (_, i) =>
      project(`p${i}`, i, '2025-01-01', true),
    );
    expect(featuredProjects(projects)).toHaveLength(3);
    expect(countFeatured(projects)).toBe(5);
  });
});
