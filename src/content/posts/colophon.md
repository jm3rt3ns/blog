---
title: 'Colophon: how this site is built'
description: 'The stack behind jackmertens.com, why each piece was chosen, and what it costs to run — which is nothing, deliberately.'
pubDate: 2026-02-14
tags:
  - astro
  - web
  - infrastructure
draft: false
comments: true
---

This site is a static build. There is no server, no database, and no admin
interface. Every post is a markdown file in a git repository, and every
deployment is a commit.

That is not minimalism for its own sake. It is the shape that makes the thing
durable: there is no runtime to patch, no dependency that can fail at request
time, and no monthly bill that grows with traffic.

## The stack

Astro renders the pages. The two content collections — posts and projects —
are validated by zod schemas at build time, which means a typo in a frontmatter
field fails the build rather than shipping a half-rendered page.

| Concern | Choice |
| --- | --- |
| Framework | Astro, static output |
| Styling | Tailwind, CSS-first configuration |
| Content | Markdown and MDX in git |
| Hosting | Cloudflare Pages |

Styling is Tailwind v4, configured entirely in CSS. There is no JavaScript
configuration file, and the design tokens live in one `@theme` block:

```css
@theme {
  --color-vellum: #efefe9;
  --color-ink: #171c22;
  --color-graphite: #5a6470;
}
```

## What it costs

Nothing. Cloudflare Pages serves static assets on the free tier, and the build
runs on their infrastructure when a commit lands on `main`. The only recurring
cost is the domain.

Nothing in the design forces a paid tier later. If the site ever needs a server
— for form handling, or a first-party comment API — Astro's Cloudflare adapter
turns individual routes into server-rendered ones without touching the rest.

## The design

The visual language is an engineering drawing: drafting vellum, hairline rules,
and a titleblock at the head of every project page. That is not decoration. A
project page has genuine metadata — who it was for, what it was built with,
when it ran — and a titleblock is the form that already exists for presenting
exactly that.

Everything else stays quiet. No shadows, no gradients, no card elevation, and
nothing animates except one deliberate moment: the titleblock fields draw in on
load, as if being plotted.
