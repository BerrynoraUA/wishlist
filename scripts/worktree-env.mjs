import fs from "node:fs";
import path from "node:path";

// T3 supplies the main checkout separately from the new worktree.
const source = process.env.T3CODE_PROJECT_ROOT;
if (!source) {
  throw new Error("T3CODE_PROJECT_ROOT is required; run this action from T3 Code.");
}

const target = process.env.T3CODE_WORKTREE_PATH || process.cwd();
if (path.resolve(source) === path.resolve(target)) {
  console.log("Main checkout: env files already available.");
  process.exit(0);
}

let copied = 0;
for (const dir of ["", "apps/frontend", "apps/native", "services/scraper"]) {
  const from = path.join(source, dir);
  if (!fs.existsSync(from)) continue;

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (
      !entry.isFile() ||
      !(entry.name === ".env" || entry.name.startsWith(".env.")) ||
      entry.name.endsWith(".example")
    ) {
      continue;
    }

    const destination = path.join(target, dir, entry.name);
    if (fs.existsSync(destination)) continue;

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(from, entry.name), destination, fs.constants.COPYFILE_EXCL);
    console.log("Copied " + path.join(dir, entry.name));
    copied++;
  }
}

console.log("Worktree env setup complete: " + copied + " file(s) copied.");
