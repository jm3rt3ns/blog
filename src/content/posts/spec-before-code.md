---
title: 'Write the spec before the code'
description: 'Writing the specification first is not ceremony. It moves the expensive arguments to the point where they are still cheap to have.'
pubDate: 2026-03-02
updatedDate: 2026-03-19
tags:
  - Practice
  - specs
  - Test Driven Development
draft: false
heroImage: './_images/spec-first.jpg'
comments: true
---

The argument against writing a specification first is always the same: it slows
you down. You could be building.

That is true, and it is beside the point. The specification is not competing
with the build. It is competing with the version of the build where you
discover, three weeks in, that two people meant different things by the word
"archive."

## Arguments get more expensive over time

An argument about scope costs almost nothing in a document. The same argument
costs a rewrite once it is in code, and it costs a migration once it is in
production data.

So the question is not whether to have the argument. The question is where you
would like to have it.

## What a useful spec contains

Not everything. A specification that tries to describe every screen becomes a
document nobody reads and nobody updates, which is worse than no document at
all.

The parts that earn their place:

- **Non-goals.** The single highest-value section. It is the only place where
  scope gets actively defended rather than passively accumulated.
- **The data model.** Field names, types, and what makes a record invalid.
- **Acceptance criteria with numbers in them.** "Fast" is not a criterion.
  "LCP under 1.2 seconds on a throttled mobile connection" is.
- **Decisions to confirm.** Defaulted so implementation is not blocked, flagged
  so they are not mistaken for settled.

## It pairs with tests, not against them

A specification says what should be true. A test asserts that it is. Written in
that order, the tests are obvious to write, because the hard thinking already
happened.

```ts
// The spec says at most three projects may be featured at once.
// So the test says it too.
it('never features more than three projects', async () => {
  const projects = await getCollection('projects');
  expect(countFeatured(projects)).toBeLessThanOrEqual(MAX_FEATURED_PROJECTS);
});
```

That test is not interesting on its own. It is interesting because six months
from now, someone adds a fourth featured project, the build fails, and the
constraint defends itself without anyone remembering it existed.

That is the whole return on writing it down.
