---
title: 'Field service scheduler'
client: 'Small electrical services firm'
summary: 'Scheduling for a crew of twelve, built to survive a dispatcher who edits the plan four times before noon.'
role: 'Discovery, build, training'
stack:
  - TypeScript
  - React
  - Node
  - SQLite
startDate: 2024-08-01
endDate: 2025-02-28
status: shipped
featured: true
order: 2
outcomes:
  - 'Retired a whiteboard and three parallel spreadsheets'
  - 'Same-day reschedules stopped requiring phone calls'
cover: './_images/field-service-scheduler.jpg'
---

> **Scaffold content.** This project is a placeholder written to exercise every
> field in the `projects` schema. Replace it with a real case study before the
> site goes to production.

## The problem

The schedule was a whiteboard. It worked, in the sense that the crew mostly
showed up in the right places, and it failed in the sense that nobody more than
ten feet from the whiteboard could tell you what it said.

## Approach

The hard part was never the calendar. It was that the plan changes constantly,
and every previous attempt at software had treated a change as an exception. So
the model made revision the normal case: every assignment carries its history,
and the current plan is just the latest revision of it.

## What shipped

A scheduler the dispatcher can drive from a phone, a day view the crew can read
without training, and a change log that answers "who moved this, and when"
without anyone having to remember.
