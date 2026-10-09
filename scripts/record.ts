#!/usr/bin/env node
// Records the screen of a booted iOS Simulator or Android emulator to an .mp4.
//
//   pnpm record:ios     [--device <udid>]   [--out <file.mp4>]
//   pnpm record:android [--device <serial>] [--out <file.mp4>]
//
// Press Enter or Ctrl+C to stop. Android's `screenrecord` caps a take at 3 minutes.

import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodePath from "node:path";
import * as NodeProcess from "node:process";
import * as NodeURL from "node:url";
import * as NodeUtil from "node:util";

const REPO_ROOT = NodePath.resolve(NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)), "..");
const RECORDINGS_DIR = NodePath.join(REPO_ROOT, "apps/native/artifacts/recordings");
const ANDROID_REMOTE_FILE = "/sdcard/wishlist-recording.mp4";

const { values } = NodeUtil.parseArgs({
  options: {
    platform: { type: "string" },
    device: { type: "string" },
    out: { type: "string" },
  },
});

const platform = values.platform;
if (platform !== "ios" && platform !== "android") {
  console.error(
    "Usage: node scripts/record.ts --platform ios|android [--device <id>] [--out <file.mp4>]",
  );
  NodeProcess.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/gu, "-").slice(0, 19);
const outFile = NodePath.resolve(
  values.out ?? NodePath.join(RECORDINGS_DIR, `${platform}-${timestamp}.mp4`),
);
await NodeFSP.mkdir(NodePath.dirname(outFile), { recursive: true });

const adbArgs = values.device ? ["-s", values.device] : [];

function run(command: string, args: readonly string[]): NodeChildProcess.SpawnSyncReturns<string> {
  const result = NodeChildProcess.spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`);
  }
  return result;
}

function waitForExit(child: NodeChildProcess.ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => child.once("exit", () => resolve()));
}

// Detached so a terminal Ctrl+C reaches only this script: the recorder must be stopped
// gracefully, or it leaves an unplayable file behind.
const recorder =
  platform === "ios"
    ? NodeChildProcess.spawn(
        "xcrun",
        [
          "simctl",
          "io",
          values.device ?? "booted",
          "recordVideo",
          "--codec=h264",
          "--force",
          outFile,
        ],
        { stdio: ["ignore", "inherit", "inherit"], detached: true },
      )
    : NodeChildProcess.spawn(
        "adb",
        [...adbArgs, "shell", "screenrecord", "--bit-rate", "8000000", ANDROID_REMOTE_FILE],
        { stdio: ["ignore", "inherit", "inherit"], detached: true },
      );

let stopping = false;
async function stop(): Promise<void> {
  if (stopping) return;
  stopping = true;
  console.log("\nStopping…");

  if (platform === "ios") {
    // simctl finalizes the file only on SIGINT.
    recorder.kill("SIGINT");
    await waitForExit(recorder);
  } else {
    NodeChildProcess.spawnSync("adb", [...adbArgs, "shell", "pkill", "-INT", "screenrecord"]);
    await waitForExit(recorder);
    run("adb", [...adbArgs, "pull", ANDROID_REMOTE_FILE, outFile]);
    run("adb", [...adbArgs, "shell", "rm", ANDROID_REMOTE_FILE]);
  }

  console.log(`Saved ${NodePath.relative(NodeProcess.cwd(), outFile)}`);
  NodeProcess.exit(0);
}

recorder.once("error", (error) => {
  console.error(error.message);
  NodeProcess.exit(1);
});
recorder.once("exit", (code) => {
  if (stopping) return;
  // Android ends on its own at the 3-minute cap; anything else is a failure to start.
  if (platform === "android" && code === 0) void stop();
  else {
    console.error(`Recorder exited with code ${String(code)}. Is a ${platform} device booted?`);
    NodeProcess.exit(1);
  }
});

// `on`, not `once`: pnpm forwards Ctrl+C twice, and the default handler for the second
// would kill this script before the file is finalized. SIGHUP covers a closed terminal.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const)
  process.on(signal, () => void stop());
NodeProcess.stdin.once("data", () => void stop());
// Last resort if this script dies mid-take: the detached recorder would otherwise keep
// running forever and never write the file.
process.once("exit", () => {
  if (recorder.exitCode !== null || recorder.signalCode !== null) return;
  if (platform === "ios") recorder.kill("SIGINT");
  else NodeChildProcess.spawnSync("adb", [...adbArgs, "shell", "pkill", "-INT", "screenrecord"]);
});
console.log(`Recording ${platform}… press Enter or Ctrl+C to stop.`);
