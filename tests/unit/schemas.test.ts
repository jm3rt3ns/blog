import { describe, it, expect } from 'vitest';
import { postSchema, projectSchema, stubImage } from '@/lib/schemas';

/**
 * Build spec §10 — content schema validation.
 *
 * The contract in §4 is that a malformed frontmatter field fails the build.
 * These tests hold that line: each required field's omission is asserted to
 * fail, so a future schema loosened by accident is caught here.
 */

const posts = postSchema(stubImage);
const projects = projectSchema(stubImage);

const validPost = {
  title: 'Write the spec before the code',
  description:
    'Writing the specification first is not ceremony. It moves the expensive arguments to where they are still cheap to have.',
  pubDate: '2026-03-02',
  tags: ['Practice', 'specs'],
};

const validProject = {
  title: 'Substation telemetry dashboard',
  summary: 'A read-only operations dashboard for substation telemetry.',
  role: 'Architecture, build, handoff',
  stack: ['TypeScript', 'Astro'],
  startDate: '2025-04-01',
  status: 'shipped',
  order: 1,
  cover: './_images/substation-telemetry.jpg',
};

describe('posts schema', () => {
  it('accepts valid frontmatter', () => {
    const result = posts.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it('applies the documented defaults', () => {
    const { title, description, pubDate } = validPost;
    const result = posts.parse({ title, description, pubDate });

    expect(result.tags).toEqual([]);
    expect(result.draft).toBe(false);
    expect(result.comments).toBe(true);
  });

  it.each(['title', 'description', 'pubDate'] as const)('fails when %s is omitted', (field) => {
    const { [field]: _omitted, ...incomplete } = validPost;
    expect(posts.safeParse(incomplete).success).toBe(false);
  });

  it('coerces date strings to Date objects', () => {
    const result = posts.parse(validPost);
    expect(result.pubDate).toBeInstanceOf(Date);
    expect(result.pubDate.toISOString().slice(0, 10)).toBe('2026-03-02');
  });

  it('normalizes tags to lowercase and hyphenated', () => {
    const result = posts.parse({ ...validPost, tags: ['Test Driven Development', 'Home  Lab'] });
    expect(result.tags).toEqual(['test-driven-development', 'home-lab']);
  });

  it('rejects a description shorter than 60 characters', () => {
    expect(posts.safeParse({ ...validPost, description: 'Too short.' }).success).toBe(false);
  });

  it('rejects a description longer than 160 characters', () => {
    const description = 'x'.repeat(161);
    expect(posts.safeParse({ ...validPost, description }).success).toBe(false);
  });

  it('rejects a non-boolean draft flag', () => {
    expect(posts.safeParse({ ...validPost, draft: 'yes' }).success).toBe(false);
  });

  it('rejects a canonicalUrl that is not a URL', () => {
    expect(posts.safeParse({ ...validPost, canonicalUrl: 'not-a-url' }).success).toBe(false);
  });

  it('accepts an updatedDate on or after pubDate', () => {
    expect(posts.safeParse({ ...validPost, updatedDate: '2026-03-19' }).success).toBe(true);
    expect(posts.safeParse({ ...validPost, updatedDate: '2026-03-02' }).success).toBe(true);
  });

  it('rejects an updatedDate before pubDate', () => {
    const result = posts.safeParse({ ...validPost, updatedDate: '2026-03-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['updatedDate']);
    }
  });
});

describe('projects schema', () => {
  it('accepts valid frontmatter', () => {
    expect(projects.safeParse(validProject).success).toBe(true);
  });

  it('defaults featured to false', () => {
    expect(projects.parse(validProject).featured).toBe(false);
  });

  it('treats client and endDate as optional — a personal, ongoing project', () => {
    const result = projects.parse(validProject);
    expect(result.client).toBeUndefined();
    expect(result.endDate).toBeUndefined();
  });

  it.each(['title', 'summary', 'role', 'stack', 'startDate', 'status', 'order', 'cover'] as const)(
    'fails when %s is omitted',
    (field) => {
      const { [field]: _omitted, ...incomplete } = validProject;
      expect(projects.safeParse(incomplete).success).toBe(false);
    },
  );

  it.each(['shipped', 'in-progress', 'archived'])('accepts the %s status', (status) => {
    expect(projects.safeParse({ ...validProject, status }).success).toBe(true);
  });

  it('rejects a status outside the enum', () => {
    expect(projects.safeParse({ ...validProject, status: 'wip' }).success).toBe(false);
  });

  it('rejects an empty stack', () => {
    expect(projects.safeParse({ ...validProject, stack: [] }).success).toBe(false);
  });

  it('rejects a non-integer order', () => {
    expect(projects.safeParse({ ...validProject, order: 1.5 }).success).toBe(false);
  });

  it('accepts one to three outcomes', () => {
    expect(projects.safeParse({ ...validProject, outcomes: ['One'] }).success).toBe(true);
    expect(projects.safeParse({ ...validProject, outcomes: ['a', 'b', 'c'] }).success).toBe(true);
  });

  it('rejects an empty or oversized outcomes list', () => {
    expect(projects.safeParse({ ...validProject, outcomes: [] }).success).toBe(false);
    expect(projects.safeParse({ ...validProject, outcomes: ['a', 'b', 'c', 'd'] }).success).toBe(
      false,
    );
  });

  it('rejects an endDate before startDate', () => {
    const result = projects.safeParse({ ...validProject, endDate: '2025-03-01' });
    expect(result.success).toBe(false);
  });
});
