import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, expect, it } from "vitest";

const script = fileURLToPath(new URL("./worktree-env.mjs", import.meta.url));
let fixture: string;
let source: string;
let target: string;

beforeEach(() => {
  fixture = fs.mkdtempSync(path.join(os.tmpdir(), "wishlist-worktree-env-"));
  source = path.join(fixture, "main checkout");
  target = path.join(fixture, "new worktree");
  fs.mkdirSync(source);
  fs.mkdirSync(target);
});

afterEach(() => {
  fs.rmSync(fixture, { recursive: true, force: true });
});

function write(root: string, file: string, content: string) {
  const destination = path.join(root, file);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
}

function run(destination = target) {
  return execFileSync(process.execPath, [script], {
    cwd: destination,
    env: { ...process.env, T3CODE_PROJECT_ROOT: source, T3CODE_WORKTREE_PATH: destination },
    encoding: "utf8",
  });
}

it("copies root and nested env files, excluding templates and unrelated files", () => {
  const files = [
    ".env.mcp-setup.local",
    "apps/frontend/.env",
    "apps/frontend/.env.local",
    "apps/native/.env",
    "apps/native/.env.store.local",
    "services/scraper/.env",
  ];
  for (const file of files) write(source, file, "TEST_VALUE=fixture\n");
  write(source, "apps/native/.env.example", "TEMPLATE=value\n");
  write(source, "apps/frontend/package.json", "{}");

  run();

  for (const file of files) {
    expect(fs.readFileSync(path.join(target, file), "utf8")).toBe("TEST_VALUE=fixture\n");
  }
  expect(fs.existsSync(path.join(target, "apps/native/.env.example"))).toBe(false);
  expect(fs.existsSync(path.join(target, "apps/frontend/package.json"))).toBe(false);
});

it("preserves worktree env files and supports repeated runs with missing source directories", () => {
  write(source, "apps/native/.env", "SOURCE=value\n");
  write(target, "apps/native/.env", "KEEP=existing\n");

  expect(run()).toContain("0 file(s) copied");
  expect(run()).toContain("0 file(s) copied");
  expect(fs.readFileSync(path.join(target, "apps/native/.env"), "utf8")).toBe("KEEP=existing\n");
});

it("does nothing when run in the main checkout", () => {
  write(source, ".env", "KEEP=main\n");

  expect(run(source)).toContain("env files already available");
  expect(fs.readFileSync(path.join(source, ".env"), "utf8")).toBe("KEEP=main\n");
});
