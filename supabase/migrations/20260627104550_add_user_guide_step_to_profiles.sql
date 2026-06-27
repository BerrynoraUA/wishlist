-- Reconcile schema drift: "userGuideStep" was added to staging.profiles directly
-- (via dashboard/SQL) without a migration, so prod never received it. The app
-- (frontend + native) selects profiles.userGuideStep, which errored on prod with
-- `column profiles.userGuideStep does not exist`.
--
-- Matches staging exactly: smallint, nullable, no default. Quoted identifier to
-- preserve the camelCase name the PostgREST queries expect. Idempotent so it is
-- safe to also apply to staging (where the column already exists).
alter table public.profiles
    add column if not exists "userGuideStep" smallint;
