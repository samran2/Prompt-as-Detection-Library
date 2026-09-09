# ADR-0003: Use PostgreSQL and a Portable OCI Service for the Future API

## Status

Proposed

## Date

2026-09-08

## Context

The future API needs stable relationships, immutable version manifests, indexed
catalog search, cursor pagination, and repeatable deployment. The project must
avoid coupling its public contract to one cloud provider. No production API or
database exists today.

## Decision

Implement the future service in TypeScript, store production catalog state in
PostgreSQL, and distribute it as a minimal OCI image. Database migrations are
versioned, deterministic, transactional, and tested against representative prior
schemas. The container runs as a non-root user with a read-only root filesystem and
exposes only the read-only HTTP service.

Deployment-specific CDN, WAF, secrets, backups, and PostgreSQL hosting remain
operator configuration. The application contract does not depend on proprietary
provider identity, database extensions, queues, or object-store APIs.

## Alternatives considered

### Serve generated JSON only

This is appropriate for the static workbench but makes relationship queries,
consistent pagination, and operational indexing difficult at API scale.

### SQLite in the production container

SQLite is excellent for local read-only snapshots, but concurrent rollout,
replication, managed backups, and service availability are better served by
PostgreSQL. A SQLite development adapter may still be evaluated separately.

### Provider-native database and functions

They reduce initial operations but create avoidable deployment and local-test
coupling. Portability is a stated project constraint.

## Consequences

- Relational constraints can enforce object, version, and relationship integrity.
- Operations must manage migrations, backups, connection pools, and restore tests.
- SQL is always parameterized and the API database role has no schema-write rights.
- Image builds require SBOM, vulnerability scan, signature, provenance, and digest
  verification before deployment.
- This decision becomes accepted only with a reviewed implementation and measured
  operational evidence.
