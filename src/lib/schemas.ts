import { z } from 'astro/zod';
import { normalizeTag } from './tags';

/**
 * Content collection schemas (build spec §4).
 *
 * These live outside `content.config.ts` so the unit tests can exercise them
 * directly — `astro:content` is only resolvable inside an Astro build, but the
 * validation rules are the part worth testing.
 *
 * `image` is Astro's schema-context image helper. It is injected rather than
 * imported so the tests can pass a plain stub in its place.
 */

/** The shape of Astro's `image()` schema helper. */
export type ImageHelper = () => z.ZodTypeAny;

/** Stand-in for `image()` outside an Astro build — validates the path only. */
export const stubImage: ImageHelper = () => z.string().min(1);

export function postSchema(image: ImageHelper) {
  return z
    .object({
      title: z.string().min(1),
      // Doubles as the meta description and the card text, so it is held to a
      // length that reads well in both places.
      description: z.string().min(60).max(160),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // Authored freely in Obsidian, normalized here to lowercase-hyphenated.
      tags: z
        .array(z.string())
        .default([])
        .transform((tags) => tags.map(normalizeTag)),
      draft: z.boolean().default(false),
      heroImage: image().optional(),
      // Lets a single post opt out of the comment thread.
      comments: z.boolean().default(true),
      canonicalUrl: z.string().url().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.updatedDate && data.updatedDate < data.pubDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['updatedDate'],
          message: 'updatedDate must be on or after pubDate',
        });
      }
    });
}

export function projectSchema(image: ImageHelper) {
  return z
    .object({
      title: z.string().min(1),
      // Omitted for personal projects.
      client: z.string().optional(),
      summary: z.string().min(1),
      role: z.string().min(1),
      stack: z.array(z.string()).min(1),
      startDate: z.coerce.date(),
      // Absent means ongoing.
      endDate: z.coerce.date().optional(),
      status: z.enum(['shipped', 'in-progress', 'archived']),
      // At most 3 true at once — a cross-entry invariant, asserted in tests.
      featured: z.boolean().default(false),
      order: z.number().int(),
      liveUrl: z.string().url().optional(),
      repoUrl: z.string().url().optional(),
      cover: image(),
      outcomes: z.array(z.string()).min(1).max(3).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.endDate && data.endDate < data.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endDate'],
          message: 'endDate must be on or after startDate',
        });
      }
    });
}

/** Max number of projects allowed to carry `featured: true` (§4.2). */
export const MAX_FEATURED_PROJECTS = 3;
