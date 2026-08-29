import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { postSchema, projectSchema, stubImage, MAX_FEATURED_PROJECTS } from '@/lib/schemas';

/**
 * Build spec §10 — invariants over the real content, not fixtures.
 *
 * `getCollection` only exists inside an Astro build, so these read the files
 * directly and run them through the same schemas the build uses. The point is
 * to catch a content mistake here, with a readable failure, rather than in a
 * build log.
 */

const CONTENT = path.resolve(import.meta.dirname, '../../src/content');

/** Every content file, excluding the `_images` attachment directories. */
function entries(collection: string, extensions: string[]): string[] {
  return readdirSync(path.join(CONTENT, collection), { withFileTypes: true })
    .filter((entry) => entry.isFile() && extensions.includes(path.extname(entry.name)))
    .map((entry) => entry.name);
}

function frontmatter(collection: string, file: string): Record<string, unknown> {
  const source = readFileSync(path.join(CONTENT, collection, file), 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!match) throw new Error(`${collection}/${file} has no frontmatter block`);
  return parseYaml(match[1]!) as Record<string, unknown>;
}

const postFiles = entries('posts', ['.md', '.mdx']);
const projectFiles = entries('projects', ['.md']);

const posts = postSchema(stubImage);
const projects = projectSchema(stubImage);

describe('posts content', () => {
  it('has at least one post', () => {
    expect(postFiles.length).toBeGreaterThan(0);
  });

  it.each(postFiles)('%s satisfies the posts schema', (file) => {
    const result = posts.safeParse(frontmatter('posts', file));
    if (!result.success) {
      throw new Error(`${file}: ${JSON.stringify(result.error.issues, null, 2)}`);
    }
    expect(result.success).toBe(true);
  });

  it('has at least one publishable post — a production build is never empty', () => {
    const publishable = postFiles.filter(
      (file) => posts.parse(frontmatter('posts', file)).draft === false,
    );
    expect(publishable.length).toBeGreaterThan(0);
  });

  it('has no duplicate slugs', () => {
    const slugs = postFiles.map((file) => file.replace(/\.mdx?$/, ''));
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('projects content', () => {
  it('has at least one project', () => {
    expect(projectFiles.length).toBeGreaterThan(0);
  });

  it.each(projectFiles)('%s satisfies the projects schema', (file) => {
    const result = projects.safeParse(frontmatter('projects', file));
    if (!result.success) {
      throw new Error(`${file}: ${JSON.stringify(result.error.issues, null, 2)}`);
    }
    expect(result.success).toBe(true);
  });

  it(`features at most ${MAX_FEATURED_PROJECTS} projects at once`, () => {
    const featured = projectFiles.filter(
      (file) => projects.parse(frontmatter('projects', file)).featured,
    );
    expect(featured.length).toBeLessThanOrEqual(MAX_FEATURED_PROJECTS);
  });

  it('gives every project a distinct order', () => {
    const orders = projectFiles.map((file) => projects.parse(frontmatter('projects', file)).order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('has no duplicate slugs', () => {
    const slugs = projectFiles.map((file) => file.replace(/\.md$/, ''));
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
