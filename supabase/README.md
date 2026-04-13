# Supabase – Migrations & Deployment Guide

This guide covers how to safely manage database schema changes, apply migrations, and deploy updates to **staging** and **production** without losing data.

---

## Prerequisites

```bash
# Install Supabase CLI (if not installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login

# Link to your remote project (run from repo root)
supabase link --project-ref <project-id>
```

> **Project refs:**
>
> - **Staging (frontend):** `usqolbxpvnhiwdispocs`
> - **Production / Mobile:** `mdwqtqqlqlzyqvnnhlln`
>
> Replace `<project-id>` with the appropriate ref. You may need to re-link when switching between staging and prod.

---

## Key Concepts

| Term                | Meaning                                                                       |
| ------------------- | ----------------------------------------------------------------------------- |
| **Migration**       | A versioned SQL file in `supabase/migrations/` that describes a schema change |
| **Remote schema**   | The current state of the database on staging/prod                             |
| **Shadow database** | A local temporary DB used by `supabase db diff` to generate migrations        |
| **Diffing**         | Comparing local schema vs remote schema to auto-generate migration SQL        |

---

## Workflow Overview

```
1. Make changes locally (via Studio or SQL)
2. Generate a migration file (diff or manual)
3. Test locally
4. Apply to staging
5. Verify staging
6. Apply to production
```

---

## 1. Local Development

### Start local Supabase

```bash
supabase start
```

This starts a local Supabase stack (Postgres, Auth, Storage, Studio) using Docker.

- **Studio:** http://localhost:54323
- **API:** http://localhost:54321
- **DB:** postgresql://postgres:postgres@localhost:54322/postgres

### Stop local Supabase

```bash
supabase stop          # keeps data
supabase stop --no-backup  # resets everything
```

---

## 2. Making Schema Changes

### Option A: Via Local Studio (recommended for quick edits)

1. Open Studio at http://localhost:54323
2. Make changes (add table, column, RLS policy, function, etc.)
3. Generate a migration from the diff:

```bash
supabase db diff -f <migration_name>
```

This creates a new file like `supabase/migrations/20260411_<migration_name>.sql` with the SQL diff.

4. **Review the generated SQL** – always check before applying.

### Option B: Write SQL manually

Create a migration file manually:

```bash
supabase migration new <migration_name>
```

Then edit the created file in `supabase/migrations/` with your SQL.

### Option C: Pull changes from remote (if you edited staging directly)

```bash
# Link to the project you changed
supabase link --project-ref <project-id>

# Pull remote schema as a migration
supabase db pull
```

> ⚠️ **Avoid editing staging/prod directly.** Use this only as a recovery step if someone made changes through the Supabase Dashboard.

---

## 3. Testing Locally

### Reset local DB and replay all migrations

```bash
supabase db reset
```

This drops the local database and replays all migrations from scratch. Use this to verify your migration files are correct and can be applied cleanly.

### Check migration status

```bash
supabase migration list
```

---

## 4. Deploying to Staging

### Link to staging project

```bash
supabase link --project-ref usqolbxpvnhiwdispocs
```

### Push migrations

```bash
supabase db push
```

This applies any **new** (not yet applied) migrations to the remote database. It does **not** drop or recreate anything — it only runs the new migration files.

### Verify

```bash
# Check which migrations have been applied
supabase migration list
```

Then test the app against staging to ensure everything works.

---

## 5. Deploying to Production

Same process, different project ref:

```bash
supabase link --project-ref mdwqtqqlqlzyqvnnhlln
supabase db push
```

> ⚠️ **Always deploy to staging first and verify before pushing to production.**

---

## Common Operations (Safe Examples)

### Add a new column (no data loss)

```sql
-- supabase/migrations/20260412000000_add_notes_to_item.sql
ALTER TABLE public.item ADD COLUMN notes text;
```

### Add a new table

```sql
-- supabase/migrations/20260412000001_create_tags.sql
CREATE TABLE public.tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags"
  ON public.tags FOR ALL
  USING (auth.uid() = user_id);
```

### Modify a function

```sql
-- supabase/migrations/20260412000002_update_get_friends.sql
CREATE OR REPLACE FUNCTION public.get_friends(...)
RETURNS ...
AS $$
  -- updated function body
$$ LANGUAGE plpgsql;
```

### Add a storage bucket

```sql
-- supabase/migrations/20260412000003_add_documents_bucket.sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);
```

---

## Dangerous Operations – How to Do Them Safely

### Rename a column (preserves data)

```sql
ALTER TABLE public.item RENAME COLUMN old_name TO new_name;
```

### Change column type (check compatibility first)

```sql
ALTER TABLE public.item ALTER COLUMN price TYPE numeric USING price::numeric;
```

### Drop a column (data is lost!)

```sql
-- Only if you're sure
ALTER TABLE public.item DROP COLUMN IF EXISTS deprecated_column;
```

### Drop a table (data is lost!)

```sql
-- ⚠️ Irreversible – back up data first!
DROP TABLE IF EXISTS public.old_table;
```

---

## Handling Edge Cases

### Migration was applied to staging but not prod, and you need to change it

**If no one else pulled the migration yet:**

1. Roll back the migration on staging by writing a new "undo" migration
2. Or: fix forward by creating a corrective migration

**Never edit an already-applied migration file.** Always create a new one.

### Someone made changes directly on staging/prod Dashboard

```bash
# Pull the remote diff
supabase link --project-ref <project-id>
supabase db pull

# This creates a migration file from the remote state
# Review it, commit it, then push to the other environment
```

### Conflicts between local and remote schema

```bash
# Repair the migration history (mark remote migrations as applied)
supabase migration repair --status applied <migration_version>
```

---

## Backup Before Risky Changes

### Export data before destructive migrations

Via Supabase Dashboard:

1. Go to **Database → Backups** to download a backup (Pro plan)

Via `pg_dump`:

```bash
# Get connection string from Supabase Dashboard → Settings → Database
pg_dump "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  --data-only \
  --table=public.item \
  > backup_items.sql
```

### Restore data

```bash
psql "postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" \
  < backup_items.sql
```

---

## Quick Reference

| Task                         | Command                                                |
| ---------------------------- | ------------------------------------------------------ |
| Start local env              | `supabase start`                                       |
| Stop local env               | `supabase stop`                                        |
| Create empty migration       | `supabase migration new <name>`                        |
| Generate migration from diff | `supabase db diff -f <name>`                           |
| Reset local DB               | `supabase db reset`                                    |
| Link to remote project       | `supabase link --project-ref <id>`                     |
| Push migrations to remote    | `supabase db push`                                     |
| Pull remote changes          | `supabase db pull`                                     |
| List migrations status       | `supabase migration list`                              |
| Repair migration history     | `supabase migration repair --status applied <version>` |

---

## Golden Rules

1. **Never edit a migration that's already been applied** to staging or prod — always create a new migration.
2. **Always test locally first** with `supabase db reset` before pushing to remote.
3. **Deploy to staging → verify → deploy to prod.** Never skip staging.
4. **Back up data** before running destructive migrations (DROP, column removal).
5. **Use `db diff`** instead of writing DDL by hand when possible — it's less error-prone.
6. **Review generated SQL** before committing — diffs can include unintended changes.
7. **Commit migration files to git** — they are the source of truth for your schema.
