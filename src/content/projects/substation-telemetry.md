---
title: 'Substation telemetry dashboard'
client: 'Regional utility contractor'
summary: 'A read-only operations dashboard that pulls substation telemetry into one place and makes the last 90 days queryable.'
role: 'Architecture, build, handoff'
stack:
  - TypeScript
  - Astro
  - PostgreSQL
  - TimescaleDB
  - Cloudflare
startDate: 2025-04-01
endDate: 2025-09-30
status: shipped
featured: true
order: 1
cover: './_images/substation-telemetry.jpg'
outcomes:
  - 'Replaced a weekly spreadsheet export with a live view'
  - 'Cut incident triage from hours to minutes'
  - 'Handed off with runbooks and a passing test suite'
---

> **Scaffold content.** This project is a placeholder written to exercise every
> field in the `projects` schema. Replace it with a real case study before the
> site goes to production.

## The problem

Telemetry existed, but it lived in four systems that did not talk to each
other. Answering a question that spanned more than one of them meant exporting
CSVs and reconciling them by hand — which meant that in practice, nobody asked
questions that spanned more than one of them.

## Approach

A single ingestion path, a time-series store, and a deliberately read-only
interface. Read-only was the important constraint: the dashboard is not a
system of record, and pretending otherwise would have made it one.

## What shipped

A dashboard covering the last 90 days, with saved queries for the questions the
operations team actually asked, and an export that produces the same CSV they
were already used to — so adoption did not require anyone to change their
downstream process on day one.
