# Authoring

Content is markdown files in git. There is no CMS. The intent is that a
subfolder of the Obsidian vault syncs into `src/content/posts/`, so drafting
happens in Obsidian and publishing is a commit.

## Where things go

| What | Where |
| --- | --- |
| Posts | `src/content/posts/*.md` (or `.mdx`) |
| Post images | `src/content/posts/_images/` |
| Projects | `src/content/projects/*.md` |
| Project covers | `src/content/projects/_images/` |

The slug comes from the filename. `spec-before-code.md` becomes
`/writing/spec-before-code/`.

Both `_images/` directories sit inside the collection folders on purpose:
`astro:assets` only processes images it can resolve at build time, and a
relative path from the markdown file is how it resolves them.

**Obsidian's attachment folder needs to point at `_images/`.** Set
_Settings → Files and links → Default location for new attachments_ to
"In subfolder under current folder", with the subfolder name `_images`.
Otherwise pasted images land wherever Obsidian defaults to and the build fails
on an unresolvable path — which is the correct failure, but an annoying one.

## Frontmatter

Plain YAML, compatible with Obsidian's properties UI. Every field is validated
by zod at build time; a bad field fails the build.

### Posts

```yaml
---
title: 'Write the spec before the code'
description: 'One sentence, 60–160 characters. Used for the meta description and the card text.'
pubDate: 2026-03-02
updatedDate: 2026-03-19 # optional
tags: # optional, free-typed — normalized on the way in
  - Practice
  - Test Driven Development
draft: false # optional, defaults to false
heroImage: './_images/spec-first.jpg' # optional
comments: true # optional, defaults to true
canonicalUrl: 'https://example.com/original' # optional, for cross-posts
---
```

Notes:

- **`description` is length-checked.** Under 60 or over 160 characters fails
  the build. It has to work as both a search-result snippet and card text.
- **Tags are normalized, not rejected.** `Test Driven Development`,
  `test driven development` and `Test-Driven Development` all become
  `test-driven-development` and all land on the same tag page. Type them
  however reads naturally in Obsidian.
- **`updatedDate` must not precede `pubDate`.** A same-day update is treated as
  a typo fix and does not stamp a revision line on the post header.
- **Reading time is never authored.** It is computed at build time from the
  body, so it cannot drift from the post.

### Projects

```yaml
---
title: 'Substation telemetry dashboard'
client: 'Regional utility contractor' # omit for personal projects
summary: 'One sentence, used on index cards.'
role: 'Architecture, build, handoff'
stack: ['TypeScript', 'Astro', 'PostgreSQL']
startDate: 2025-04-01
endDate: 2025-09-30 # omit for ongoing
status: shipped # shipped | in-progress | archived
featured: true # optional, defaults to false — at most 3 at once
order: 1 # manual sort within the index
liveUrl: 'https://example.com' # optional
repoUrl: 'https://github.com/…' # optional
cover: './_images/substation-telemetry.jpg'
outcomes: # optional, 1–3 short result statements
  - 'Replaced a weekly spreadsheet export with a live view'
---
```

These fields are not decoration — they render as a literal titleblock at the
head of the project page. An omitted `client` makes the block shorter, not
blank.

**At most three projects may carry `featured: true`.** A unit test enforces it,
so a fourth fails `pnpm test` rather than quietly pushing one off the home page.

## Drafts

`draft: true` renders in `pnpm dev` and is excluded from `pnpm build`. That is
asserted in the unit tests, and `src/content/posts/hairlines.mdx` exists partly
to keep the behavior exercised.

## MDX

Use `.md` by default. Reach for `.mdx` only when a post genuinely needs a
component — importing one into every post to save a few keystrokes is how a
content directory stops being portable.

## Open question: wikilinks

**Obsidian wikilinks (`[[Note Name]]`) are not supported, and will render as
literal text.** Nothing strips or resolves them today.

This is flagged rather than solved because the spec asks for a decision first
(§12). There are three reasonable answers:

1. **Don't use them in synced posts.** Write standard markdown links in
   anything destined for the site. Zero code, zero risk.
2. **Strip them.** A small remark plugin unwraps `[[Note Name]]` to plain text.
   Cheap, but silently drops the author's intent to link.
3. **Resolve them.** The plugin maps a note title to a published slug and emits
   a real link, failing the build on an unresolvable target. Most useful, most
   work, and it needs a rule for what happens when a wikilink points at a note
   that is not published.

Option 3 is the only one worth building if the vault is genuinely the source of
truth and notes link to each other. Confirm before it gets built — see
`docs/decisions.md`.
