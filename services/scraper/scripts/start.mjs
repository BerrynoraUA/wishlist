import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const serviceDirectory = resolve(import.meta.dirname, "..");
const localPython =
  process.platform === "win32"
    ? resolve(serviceDirectory, ".venv", "Scripts", "python.exe")
    : resolve(serviceDirectory, ".venv", "bin", "python");

const candidates = [
  ...(existsSync(localPython) ? [localPython] : []),
  ...(process.platform === "win32" ? ["py", "python"] : ["python3.12", "python3", "python"]),
];

const python = candidates.find((candidate) => {
  const probeArgs = candidate === "py" ? ["-3.12", "--version"] : ["--version"];
  const result = spawnSync(candidate, probeArgs, { stdio: "ignore" });
  return result.status === 0;
});

if (!python) {
  console.error(
    "Python 3.12 не знайдено. Створіть services/scraper/.venv або встановіть Python 3.12.",
  );
  process.exit(1);
}

const pythonArgs = [...(python === "py" ? ["-3.12"] : []), "-m", "app", ...process.argv.slice(2)];
const child = spawn(python, pythonArgs, {
  cwd: serviceDirectory,
  env: process.env,
  stdio: "inherit",
});

child.on("error", (error) => {
  console.error(`Не вдалося запустити Python: ${error.message}`);
  process.exit(1);
});
child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
