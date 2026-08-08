import type { CollectionEntry } from 'astro:content';
import { MAX_FEATURED_PROJECTS } from './schemas';

/**
 * Typed query helpers over the content collections (build spec §13).
 *
 * These are deliberately pure: they take entries and return entries, and never
 * call `getCollection` themselves. Pages fetch, then pipe through here. That
 * keeps every ordering and visibility rule unit-testable, and keeps this
 * module free of anything that assumes a build-time-only environment — see
 * §11 on the SSR upgrade path.
 */

export type Post = CollectionEntry<'posts'>;
export type Project = CollectionEntry<'projects'>;

/** Posts per page on `/writing/` and the tag indexes (§5). */
export const POSTS_PER_PAGE = 10;

/** Featured projects shown on the home page (§5). */
export const FEATURED_PROJECT_COUNT = 3;

/** Recent posts shown on the home page (§5). */
export const RECENT_POST_COUNT = 5;

export { MAX_FEATURED_PROJECTS };

/**
 * Whether a post should be visible in the current build.
 *
 * Drafts render in `dev` so they can be previewed, and are excluded from
 * production builds (§4.1). `import.meta.env.DEV` is passed in rather than
 * read here so the rule is testable without faking a build environment.
 */
export function isVisible(post: Post, isDev: boolean): boolean {
  return isDev || !post.data.draft;
}

/** Newest first. */
export function byNewest(a: Post, b: Post): number {
  return b.data.pubDate.getTime() - a.data.pubDate.getTime();
}

/**
 * The published post list: drafts filtered per environment, newest first.
 * This is the only ordering `/writing/` and the tag pages use.
 */
export function publishedPosts(posts: readonly Post[], isDev: boolean): Post[] {
  return posts.filter((post) => isVisible(post, isDev)).sort(byNewest);
}

/** The `n` most recent published posts, for the home page. */
export function recentPosts(
  posts: readonly Post[],
  isDev: boolean,
  limit: number = RECENT_POST_COUNT,
): Post[] {
  return publishedPosts(posts, isDev).slice(0, limit);
}

/** Every tag in use, deduped and alphabetical. Tags are normalized by the schema. */
export function allTags(posts: readonly Post[], isDev: boolean): string[] {
  const tags = new Set<string>();
  for (const post of publishedPosts(posts, isDev)) {
    for (const tag of post.data.tags) tags.add(tag);
  }
  return [...tags].sort();
}

/** Posts carrying `tag`, newest first. */
export function postsByTag(posts: readonly Post[], isDev: boolean, tag: string): Post[] {
  return publishedPosts(posts, isDev).filter((post) => post.data.tags.includes(tag));
}

/** Tag -> post count, for the tag list. */
export function tagCounts(posts: readonly Post[], isDev: boolean): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of publishedPosts(posts, isDev)) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Project index order: manual `order` ascending, then most recent start (§5).
 */
export function byProjectOrder(a: Project, b: Project): number {
  if (a.data.order !== b.data.order) return a.data.order - b.data.order;
  return b.data.startDate.getTime() - a.data.startDate.getTime();
}

export function sortedProjects(projects: readonly Project[]): Project[] {
  return [...projects].sort(byProjectOrder);
}

/**
 * Featured projects for the home page, in index order.
 *
 * The `featured: true` cap is a content invariant asserted in the unit tests,
 * so this slice is a display guard rather than the enforcement point.
 */
export function featuredProjects(
  projects: readonly Project[],
  limit: number = FEATURED_PROJECT_COUNT,
): Project[] {
  return sortedProjects(projects.filter((project) => project.data.featured)).slice(0, limit);
}

/** Count of projects flagged featured, before any display cap. */
export function countFeatured(projects: readonly Project[]): number {
  return projects.filter((project) => project.data.featured).length;
}
