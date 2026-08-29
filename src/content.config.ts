import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { postSchema, projectSchema } from './lib/schemas';

/**
 * Content collections (build spec §4).
 *
 * Every field is validated at build time — a malformed frontmatter field fails
 * the build rather than degrading silently into a half-rendered page.
 *
 * The schemas themselves live in `src/lib/schemas.ts` so they stay unit
 * testable. Slugs come from the filename; the glob loader uses it as the id.
 */

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.{md,mdx}' }),
  schema: ({ image }) => postSchema(image),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: ({ image }) => projectSchema(image),
});

export const collections = { posts, projects };
