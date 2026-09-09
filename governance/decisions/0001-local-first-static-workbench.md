# ADR-0001: Keep the Workbench Local-First and Static

## Status

Accepted

## Date

2026-09-08

## Context

The existing product is a plain-browser workbench backed by generated static
files. It searches and composes prompts without accounts, a server runtime,
analytics, or model calls. Analysts may add sensitive environment context, so an
automatic network path would expand both privacy and security risk. GitHub Pages
also provides a simple public demo with a narrow artifact boundary.

Evidence: `demo/index.html`, `demo/app.js`, `demo/core.js`, and the eight-file
allowlist in `scripts/build_demo.cjs`.

## Decision

Keep the workbench fully static and local-first. Search, filter, prompt composition,
editing, and export execute in the browser. Context and drafts stay in memory and
clear on reload. The build publishes only the explicit allowlist.

Network-backed capabilities are separate opt-in clients and may not silently alter
the static application's behavior. No analytics, remote model, authentication, or
persistence is added to this runtime without a new decision and privacy review.

## Alternatives considered

### Server-rendered application

This could centralize search and updates, but would create operational, privacy,
and availability dependencies for tasks that work locally today.

### Client framework with a remote backend

This might accelerate interactive features, but adds supply-chain and network
surface without being necessary for the current catalog size or workflows.

## Consequences

- Offline use and user control remain first-class.
- Static hosting receives ordinary page requests but no analyst context from the
  application.
- Large datasets must be bounded, partitioned, or efficiently indexed in static
  assets rather than delegated to a server.
- Server-only features live in explicitly separate applications and packages.
- The public artifact allowlist remains a security and privacy release gate.
