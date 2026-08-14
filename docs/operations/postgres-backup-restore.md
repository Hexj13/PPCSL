---
title: Postgres backup and restore
owner: platform
tags:
  - type/runbook
  - domain/ops
  - scope/core
  - status/active
---

# Postgres backup and restore (Render)

Production databases (`kupito-pg`, `makinaguru-pg`) run on Render Postgres **pro_4gb**. Paid Render Postgres includes point-in-time recovery (PITR) and logical exports. Self-hosted `pg_dump` scripts remain for local and non-Render hosts.

Dashboard: [kupito-pg](https://dashboard.render.com/d/dpg-d4abkthe2q1c73e49hv0-a). Official flow: [Render Postgres recovery](https://render.com/docs/postgresql-backups).

## RPO / RTO

| Mechanism | RPO | RTO |
|-----------|-----|-----|
| Render PITR | Continuous WAL; Pro workspace window is **7 days**. Restore cannot target the last 10 minutes. | New instance; time scales with disk size (currently ~5 GB). Validate before switching `DB_*`. |
| Render logical export | When the export was created; retained **7 days** on Render | `pg_restore` of the `.dir.tar.gz` export |
| `pg_dump` / `pg_restore` | When the dump was taken | Local Docker restore of a custom-format dump: see the drill below |

Legal backup retention is 30 days (`config/legal.ts` §8.8). Do not keep extra copies longer unless a legal hold requires it.

## Network and SSL

Backend services in the same region must use the **internal** hostname (`dpg-…-a`, no `.frankfurt-postgres.render.com` suffix). Application sessions on `kupito-pg` use private `10.x` addresses **without SSL**.

- Set `DB_SSL=false` on the backend when `DB_HOST` is internal. If `DB_SSL` is unset, production TypeORM enables SSL (`rejectUnauthorized: false`) and the ready check fails on the internal host.
- Do not leave Postgres Access Control on `0.0.0.0/0`. Allow only a temporary office/home CIDR for `pg_dump` / pgAdmin / MCP, or dump from **Render Shell** on the backend (internal network).
- Render MCP cannot change `ipAllowList`. Edit Dashboard → Postgres → **Access Control**.

## Render PITR

Do not restore onto the live primary. PITR always creates a **new** instance.

1. Dashboard → database → **Recovery** → Point-in-Time Recovery → **Restore Database**.
2. Name the recovery instance, pick a timestamp, optionally copy settings (IP allow list is always copied).
3. Wait until status is **Available**. Connect with the new internal `DB_HOST` and `DB_SSL=false`.
4. Check `/health/ready`, counts (`listings`, `users`, `parser_runs`), and listing search.
5. Point services at the new instance only after validation. Then delete or suspend the original.

## Logical export from Dashboard

On the same **Recovery** page, **Create export** produces a `.dir.tar.gz` archive (7-day retention). Restore only into an empty database:

```bash
tar -zxvf 2025-02-03T19_21Z.dir.tar.gz
pg_restore --dbname="$DATABASE_URL" --verbose --clean --if-exists --no-owner --no-privileges --format=directory ./extracted_dir
```

Prefer PITR for accidental data loss; it is usually more recent than the last export.

## `pg_dump` from Render Shell

On `kupito-backend` Shell (uses service env, internal host):

```bash
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -Fc -f /tmp/kupito.dump
```

Delete the file after copying it off the instance. Repo scripts for local / self-hosted hosts:

- `npm run backup` → `core/backend/src/scripts/production/backup-database.ts`
- `core/backend/config/scripts/backup-database.sh`

## Local restore drill (Docker)

Do not create a paid temporary database on Render for a routine drill. Use local Docker.

```bash
docker exec kupito-postgres createdb -U kupito kupito_restore_drill || true
docker exec kupito-postgres pg_dump -U kupito -d kupito -Fc -f /tmp/kupito_restore_drill.dump
docker exec kupito-postgres pg_restore --clean --if-exists --no-owner --no-acl -U kupito -d kupito_restore_drill /tmp/kupito_restore_drill.dump
docker exec kupito-postgres psql -U kupito -d kupito_restore_drill -c "SELECT count(*) FROM listings;"
docker exec kupito-postgres dropdb -U kupito kupito_restore_drill
docker exec kupito-postgres rm -f /tmp/kupito_restore_drill.dump
```

Recorded 2026-08-14: Docker daemon was not running on the operator machine and local `psql`/`pg_dump` were not installed, so the dump/restore commands were not executed in this pass. Re-run the block above when Docker Postgres is up and replace this sentence with duration and `SELECT count(*) FROM listings`.

## After a production restore

- Run migrations if the restored schema is behind code: `cd core/backend && npm run migration:run:prod`
- Warm listing search / similar caches by hitting search and a few detail pages
- Confirm Sentry cron monitors still check in
