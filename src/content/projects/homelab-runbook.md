---
title: 'Homelab runbook'
summary: 'The services I self-host, documented well enough that a reinstall is a checklist rather than an archaeology project.'
role: 'Everything'
stack:
  - Docker
  - Traefik
  - Cloudflare Tunnel
  - Ansible
startDate: 2023-11-01
status: in-progress
featured: true
order: 3
repoUrl: 'https://github.com/jm3rt3ns/blog'
cover: './_images/homelab-runbook.jpg'
outcomes:
  - 'A full rebuild is now a documented afternoon, not a lost weekend'
---

> **Scaffold content.** This project is a placeholder written to exercise the
> schema's optional fields — note the absent `client` and `endDate`, which mark
> it as personal and ongoing. Replace it before the site goes to production.

## Why write it down

A homelab is only useful if you trust it, and you only trust it if you know you
can rebuild it. The services matter less than the documentation of the
services.

## Current shape

Everything runs in containers behind a single reverse proxy, exposed through a
Cloudflare Tunnel so nothing is port-forwarded. Configuration is in git;
secrets are not.

The `status` on this one is `in-progress` and will probably stay that way,
which is the honest answer for a system that exists to be tinkered with.
