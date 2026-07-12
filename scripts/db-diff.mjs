#!/usr/bin/env node
// Compare the schema of the staging and production Supabase databases.
//
// It dumps the schema of each remote database with `supabase db dump`
// (schema-only, no data) and shows a unified diff between the two.
//
// Usage:
//   node scripts/db-diff.mjs [options]
//   pnpm db:diff
//
// Options:
//   --schema <list>   Comma-separated schemas to compare (default: public)
//   --data            Compare table DATA instead of schema (row-level dump)
//   --keep            Keep the generated dump files and print their paths
//   -h, --help        Show this help
//
// Credentials (keep these OUT of git):
//   Easiest — provide just the DB password for each project. The script builds
//   the connection URL and percent-encodes the password for you, so special
//   characters (| > } ^ etc.) are handled automatically:
//     STAGING_DB_PASSWORD, PROD_DB_PASSWORD
//   Full URL — paste a connection string verbatim (raw password is fine, the
//   script percent-encodes it). Use the SESSION POOLER string on IPv4-only
//   networks, where the direct db.<ref>.supabase.co host does not resolve:
//     STAGING_DB_URL, PROD_DB_URL
//
//   Find the password / connection string in the Supabase dashboard:
//     Project → Settings → Database → Connection string
//     (choose "Session pooler" — port 5432; NOT "Transaction pooler" / 6543)
//
//   Set them once in a git-ignored `.env.db-diff` file at the repo root:
//     STAGING_DB_PASSWORD=your-staging-db-password
//     PROD_DB_PASSWORD=your-production-db-password
//   Or per-session (PowerShell):
//     $env:STAGING_DB_PASSWORD='...'; $env:PROD_DB_PASSWORD='...'
//
// Requirements:
//   - Docker Desktop must be running: `supabase db dump` runs pg_dump inside a
//     container to match the remote Postgres version (same prerequisite as
//     `supabase start`).
//
// Notes:
//   - Staging ref: usqolbxpvnhiwdispocs   Production ref: iwdgsvydfgtuqdoowbhj
//   - Password-only mode uses the direct connection (db.<ref>.supabase.co:5432),
//     which is IPv6-only. If it fails to resolve ("could not translate host
//     name"), use *_DB_URL with the session-pooler string (IPv4, port 5432).
//     Never use the transaction pooler (port 6543) — pg_dump can't use it.
//   - Exit code: 0 = no differences, 1 = differences found, 2 = error.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Load KEY=VALUE pairs from a git-ignored .env.db-diff at the repo root so the
// connection strings can be set once instead of re-exported every run. Existing
// process.env values win, so `STAGING_DB_URL=... pnpm db:diff` still overrides.
function loadEnvFile() {
  const path = join(REPO_ROOT, ".env.db-diff");
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const REFS = {
  staging: "usqolbxpvnhiwdispocs",
  prod: "iwdgsvydfgtuqdoowbhj",
};

// Percent-encode the password inside a connection string so a value pasted
// verbatim from the dashboard (raw special characters like | > } ^) parses.
// The password is the userinfo segment between the first ':' and the LAST '@'
// (hosts contain no '@'). A password that is already percent-encoded round-trips
// through decode→encode unchanged, so it is left as-is instead of double-encoded.
function encodeUrlPassword(raw) {
  const schemeMatch = raw.match(/^([a-zA-Z][\w+.-]*:\/\/)(.*)$/s);
  if (!schemeMatch) return raw;
  const [, scheme, afterScheme] = schemeMatch;
  const at = afterScheme.lastIndexOf("@");
  if (at === -1) return raw;
  const userinfo = afterScheme.slice(0, at);
  const rest = afterScheme.slice(at + 1);
  const colon = userinfo.indexOf(":");
  if (colon === -1) return raw;
  const user = userinfo.slice(0, colon);
  const password = userinfo.slice(colon + 1);
  let encoded;
  try {
    encoded =
      encodeURIComponent(decodeURIComponent(password)) === password
        ? password
        : encodeURIComponent(password);
  } catch {
    encoded = encodeURIComponent(password);
  }
  return `${scheme}${user}:${encoded}@${rest}`;
}

// Resolve a Postgres connection URL for an environment. A full <NAME>_DB_URL
// wins (use the session-pooler string for IPv4 networks); its password is
// auto-encoded. Otherwise build the direct-connection URL from <NAME>_DB_PASSWORD.
// Returns null if neither is set.
function resolveDbUrl(name, ref) {
  const url = process.env[`${name}_DB_URL`];
  if (url) return encodeUrlPassword(url);
  const password = process.env[`${name}_DB_PASSWORD`];
  if (password) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
  }
  return null;
}

function parseArgs(argv) {
  const opts = { schema: "public", data: false, keep: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") opts.help = true;
    else if (arg === "--data") opts.data = true;
    else if (arg === "--keep") opts.keep = true;
    else if (arg === "--schema") opts.schema = argv[++i];
    else if (arg.startsWith("--schema=")) opts.schema = arg.slice("--schema=".length);
    else {
      console.error(`Unknown argument: ${arg}\n`);
      opts.help = true;
    }
  }
  return opts;
}

function printHelp() {
  // The top-of-file comment block is the canonical help text.
  console.log(
    [
      "Compare the schema of the staging and production Supabase databases.",
      "",
      "Usage:",
      "  node scripts/db-diff.mjs [options]",
      "  pnpm db:diff",
      "",
      "Options:",
      "  --schema <list>   Comma-separated schemas to compare (default: public)",
      "  --data            Compare table DATA instead of schema",
      "  --keep            Keep the generated dump files and print their paths",
      "  -h, --help        Show this help",
      "",
      `Staging ref: ${REFS.staging}    Production ref: ${REFS.prod}`,
      "",
      "Set STAGING_DB_PASSWORD and PROD_DB_PASSWORD to each project's database",
      "password (Supabase dashboard → Settings → Database). The script builds and",
      "percent-encodes the connection URL for you.",
      "IPv4 networks: if the direct host fails to resolve, set STAGING_DB_URL /",
      "PROD_DB_URL to the Session pooler string (port 5432) — paste it as-is, the",
      "script encodes the password. Never use the transaction pooler (port 6543).",
      "",
      "Tip: create a git-ignored .env.db-diff at the repo root with these vars",
      "to avoid re-exporting them each run.",
      "",
      "Requires Docker Desktop running (supabase db dump runs pg_dump in a container).",
    ].join("\n"),
  );
}

// Resolve the real supabase binary shipped with the `supabase` dev dependency
// and invoke it directly (no shell). Passing args as an array means connection
// strings with special characters are handed over literally — no quoting/escaping
// pitfalls — and it sidesteps Node's refusal to spawn .cmd shims without a shell.
function resolveSupabaseBin() {
  const require = createRequire(import.meta.url);
  let pkgDir;
  try {
    pkgDir = dirname(require.resolve("supabase/package.json"));
  } catch {
    return null;
  }
  const candidates =
    process.platform === "win32"
      ? [join(pkgDir, "bin", "supabase.exe"), join(pkgDir, "bin", "supabase")]
      : [join(pkgDir, "bin", "supabase")];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const SUPABASE_BIN = resolveSupabaseBin();

function dump({ label, dbUrl, file, schema, data }) {
  if (!SUPABASE_BIN) {
    throw new Error(
      "Could not find the supabase CLI binary. Run `pnpm install` at the repo root first.",
    );
  }

  const args = ["db", "dump", "--db-url", dbUrl, "-f", file];
  for (const s of schema
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)) {
    args.push("-s", s);
  }
  if (data) args.push("--data-only");

  console.log(`→ Dumping ${label} (${data ? "data" : "schema"}: ${schema}) …`);
  const res = spawnSync(SUPABASE_BIN, args, { stdio: ["ignore", "inherit", "inherit"] });
  if (res.error) {
    throw new Error(`Failed to launch supabase CLI: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`supabase db dump failed for ${label} (exit ${res.status}).`);
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  loadEnvFile();

  const stagingUrl = resolveDbUrl("STAGING", REFS.staging);
  const prodUrl = resolveDbUrl("PROD", REFS.prod);
  const missing = [
    !stagingUrl && "STAGING_DB_PASSWORD (or STAGING_DB_URL)",
    !prodUrl && "PROD_DB_PASSWORD (or PROD_DB_URL)",
  ].filter(Boolean);
  if (missing.length) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}\n`);
    printHelp();
    process.exitCode = 2;
    return;
  }

  const workDir = mkdtempSync(join(tmpdir(), "supabase-db-diff-"));
  const stagingFile = join(workDir, "staging.sql");
  const prodFile = join(workDir, "prod.sql");

  // Set process.exitCode (not process.exit) so the finally block always runs —
  // process.exit() terminates immediately and would skip cleanup.
  try {
    dump({
      label: "staging",
      dbUrl: stagingUrl,
      file: stagingFile,
      schema: opts.schema,
      data: opts.data,
    });
    dump({
      label: "production",
      dbUrl: prodUrl,
      file: prodFile,
      schema: opts.schema,
      data: opts.data,
    });

    console.log("\n=== diff (staging → production) ===\n");
    // git diff --no-index gives a colored unified diff on a TTY and returns
    // exit 1 when the files differ, 0 when they are identical.
    const diff = spawnSync(
      "git",
      ["--no-pager", "diff", "--no-index", "--", stagingFile, prodFile],
      { stdio: "inherit" },
    );

    if (diff.error) throw new Error(`Failed to run git diff: ${diff.error.message}`);

    if (diff.status === 0) {
      console.log("✅ No differences — staging and production schemas match.");
      process.exitCode = 0;
    } else {
      console.log("\n⚠️  Differences found between staging and production (see diff above).");
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`\n${err.message}`);
    process.exitCode = 2;
  } finally {
    if (opts.keep) {
      if (existsSync(stagingFile)) console.log(`\nStaging dump: ${stagingFile}`);
      if (existsSync(prodFile)) console.log(`Production dump: ${prodFile}`);
    } else {
      rmSync(workDir, { recursive: true, force: true });
    }
  }
}

main();
