#!/usr/bin/env node

import * as NodeChildProcess from "node:child_process";
import * as NodeFSP from "node:fs/promises";
import * as NodeNet from "node:net";
import * as NodePath from "node:path";
import * as NodeProcess from "node:process";
import * as NodeURL from "node:url";

import { SHOWCASE_CONTROL_PORT } from "../../packages/backend/supabase/showcase/constants.ts";
import { startShowcaseControlServer } from "./showcase-control-server.ts";
import { renderFramedScreenshot } from "./showcase-frames.ts";
import {
  normalizeStorePng,
  validateStoreAsset,
  validateStoreAssetCount,
} from "./showcase-images.ts";
import showcaseConfig, {
  SHOWCASE_SCENES,
  type ShowcaseAndroidDevice,
  type ShowcaseAppearance,
  type ShowcaseConfig,
  type ShowcaseDevice,
  type ShowcaseIosDevice,
  type ShowcaseScene,
} from "./showcase.config.ts";

const REPO_ROOT = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  "../..",
);
const NATIVE_ROOT = NodePath.join(REPO_ROOT, "apps/native");
const APP_ID = "com.berrynora.wishlane";
const APP_SCHEME = "wishlane";
const IOS_SCHEME = "Wishlane";
const IOS_DERIVED_DATA = NodePath.join(NATIVE_ROOT, "artifacts/ios-derived-data");
const IOS_APP_PATH = NodePath.join(
  IOS_DERIVED_DATA,
  "Build/Products/Debug-iphonesimulator/Wishlane.app",
);
const ANDROID_APK_PATH = NodePath.join(
  NATIVE_ROOT,
  "android/app/build/outputs/apk/debug/app-debug.apk",
);
const PNPM = NodeProcess.platform === "win32" ? "pnpm.cmd" : "pnpm";

/**
 * The first scene of a device also covers the cold Metro bundle and the dev-client
 * update install. On a freshly booted emulator, with Metro rebuilding its file map
 * from scratch, that alone runs past five minutes — so this is deliberately generous
 * rather than tuned. Later scenes are ordinary navigations.
 */
const FIRST_SCENE_TIMEOUT_MS = 900_000;

/** Guest RAM for emulators this runner starts. See the launch call for why. */
const ANDROID_EMULATOR_MEMORY_MB = 4096;

export function resolveAndroidSdkRoot(
  environment: Readonly<Record<string, string | undefined>>,
  platform: NodeJS.Platform = NodeProcess.platform,
): string {
  const configured = environment.ANDROID_HOME ?? environment.ANDROID_SDK_ROOT;
  if (configured) return configured;
  const home = environment.HOME ?? environment.USERPROFILE ?? "";
  if (platform === "darwin") return NodePath.join(home, "Library/Android/sdk");
  if (platform === "win32") return NodePath.join(home, "AppData/Local/Android/Sdk");
  return NodePath.join(home, "Android/Sdk");
}

const ANDROID_SDK_ROOT = resolveAndroidSdkRoot(NodeProcess.env);
const EXECUTABLE_SUFFIX = NodeProcess.platform === "win32" ? ".exe" : "";

interface CliOptions {
  readonly platforms: ReadonlySet<ShowcaseDevice["platform"]>;
  readonly deviceIds: ReadonlySet<string>;
  readonly scenes: ReadonlySet<ShowcaseScene>;
  readonly appearances: ReadonlySet<ShowcaseAppearance>;
  readonly skipBuild: boolean;
  readonly skipMetro: boolean;
  readonly skipFrames: boolean;
  readonly keepRunning: boolean;
  readonly validateOnly: boolean;
  readonly list: boolean;
}

export interface ShowcaseCapture {
  readonly device: ShowcaseDevice;
  readonly scenes: readonly ShowcaseScene[];
  readonly appearance: ShowcaseAppearance;
}

interface IosCaptureCleanup {
  readonly udid: string;
  readonly startedByRunner: boolean;
  readonly createdByRunner: boolean;
}

interface AndroidCaptureCleanup {
  readonly device: ShowcaseAndroidDevice;
  readonly serial: string;
  readonly startedByRunner: boolean;
}

export function showcaseCaptureDirectory(
  outputDirectory: string,
  capture: Pick<ShowcaseCapture, "device" | "appearance">,
): string {
  return NodePath.join(outputDirectory, capture.device.storeAsset.directory, capture.appearance);
}

function argumentValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value.`);
  return value;
}

export function parseShowcaseCliArgs(args: readonly string[]): CliOptions {
  const platforms = new Set<ShowcaseDevice["platform"]>();
  const deviceIds = new Set<string>();
  const scenes = new Set<ShowcaseScene>();
  const appearances = new Set<ShowcaseAppearance>();
  let skipBuild = false;
  let skipMetro = false;
  let skipFrames = false;
  let keepRunning = false;
  let validateOnly = false;
  let list = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--platform") {
      const value = argumentValue(args, index, argument);
      if (value !== "ios" && value !== "android" && value !== "all") {
        throw new Error(`Unsupported platform '${value}'. Use ios, android, or all.`);
      }
      if (value === "all") {
        platforms.add("ios");
        platforms.add("android");
      } else {
        platforms.add(value);
      }
      index += 1;
    } else if (argument === "--device") {
      deviceIds.add(argumentValue(args, index, argument));
      index += 1;
    } else if (argument === "--scene") {
      const value = argumentValue(args, index, argument);
      if (!SHOWCASE_SCENES.includes(value as ShowcaseScene)) {
        throw new Error(`Unsupported scene '${value}'. Use ${SHOWCASE_SCENES.join(", ")}.`);
      }
      scenes.add(value as ShowcaseScene);
      index += 1;
    } else if (argument === "--appearance") {
      const value = argumentValue(args, index, argument);
      if (value !== "light" && value !== "dark" && value !== "both") {
        throw new Error(`Unsupported appearance '${value}'. Use light, dark, or both.`);
      }
      if (value === "both") {
        appearances.add("light");
        appearances.add("dark");
      } else {
        appearances.add(value);
      }
      index += 1;
    } else if (argument === "--skip-build") {
      skipBuild = true;
    } else if (argument === "--skip-metro") {
      skipMetro = true;
    } else if (argument === "--no-frames") {
      skipFrames = true;
    } else if (argument === "--keep-running") {
      keepRunning = true;
    } else if (argument === "--validate-only") {
      validateOnly = true;
    } else if (argument === "--list" || argument === "--help" || argument === "-h") {
      list = true;
    } else {
      throw new Error(`Unknown option '${argument}'.`);
    }
  }

  return {
    platforms,
    deviceIds,
    scenes,
    appearances,
    skipBuild,
    skipMetro,
    skipFrames,
    keepRunning,
    validateOnly,
    list,
  };
}

export function planShowcaseCaptures(
  config: ShowcaseConfig,
  options: Pick<CliOptions, "platforms" | "deviceIds" | "scenes" | "appearances">,
): readonly ShowcaseCapture[] {
  const knownDeviceIds = new Set(config.devices.map((device) => device.id));
  for (const id of options.deviceIds) {
    if (!knownDeviceIds.has(id)) {
      throw new Error(`Unknown device '${id}'. Run with --list to see configured devices.`);
    }
  }

  const captures = config.devices
    .filter((device) => options.platforms.size === 0 || options.platforms.has(device.platform))
    .filter((device) => options.deviceIds.size === 0 || options.deviceIds.has(device.id))
    .flatMap((device) => {
      const appearances =
        options.appearances.size === 0 ? [device.appearance] : [...options.appearances];
      return appearances.map((appearance) => ({
        device,
        appearance,
        scenes:
          options.scenes.size === 0
            ? device.scenes
            : device.scenes.filter((scene) => options.scenes.has(scene)),
      }));
    })
    .filter((capture) => capture.scenes.length > 0);

  if (captures.length === 0) {
    throw new Error("No captures match the selected platform, device, and scene filters.");
  }
  return captures;
}

function printUsage(config: ShowcaseConfig): void {
  NodeProcess.stdout.write(`Wishlane app-store showcase

Usage:
  pnpm screenshots [options]

Options:
  --platform ios|android|all  Capture one platform (repeatable)
  --device <id>              Capture one configured device (repeatable)
  --scene <name>             Capture one scene (repeatable)
  --appearance light|dark|both
                             Override the configured appearance
  --skip-build               Reuse the existing simulator app / debug APK
  --skip-metro               Reuse an already running showcase Metro server
  --no-frames                Skip the framed marketing set
  --keep-running             Leave devices and Metro running after capture
  --validate-only            Validate existing upload assets without capturing
  --list                     Print this help and the configured matrix

Scenes: ${SHOWCASE_SCENES.join(", ")}

Configured devices:
${config.devices
  .map((device) => {
    const target = device.platform === "ios" ? device.simulator : device.avd;
    return `  ${device.id.padEnd(18)} ${device.platform.padEnd(8)} ${target} -> ${device.storeAsset.directory}/{light|dark} (${device.storeAsset.width}×${device.storeAsset.height}, default ${device.appearance}) [${device.scenes.join(", ")}]`;
  })
  .join("\n")}
`);
}

/** Node 24 refuses to spawn Windows `.cmd`/`.bat` shims without a shell. */
function needsShell(command: string): boolean {
  return NodeProcess.platform === "win32" && /\.(cmd|bat)$/iu.test(command);
}

function spawnProcess(
  command: string,
  args: readonly string[],
  options: NodeChildProcess.SpawnOptions = {},
): NodeChildProcess.ChildProcess {
  const shell = needsShell(command);
  return NodeChildProcess.spawn(
    // Under a shell the command is concatenated, so an absolute path containing a
    // space would otherwise be split into a command and a stray argument.
    shell && command.includes(" ") ? `"${command}"` : command,
    [...args],
    {
      cwd: REPO_ROOT,
      env: NodeProcess.env,
      stdio: "inherit",
      shell,
      ...options,
    },
  );
}

async function runCommand(
  command: string,
  args: readonly string[],
  options: NodeChildProcess.SpawnOptions = {},
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawnProcess(command, args, options);
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed ${signal ? `with signal ${signal}` : `with code ${String(code)}`}.`,
          ),
        );
      }
    });
  });
}

async function commandOutput(
  command: string,
  args: readonly string[],
  options: NodeChildProcess.ExecFileOptions = {},
): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    NodeChildProcess.execFile(
      command,
      [...args],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
        shell: needsShell(command),
        ...options,
      },
      (error, stdout) => (error ? reject(error) : resolve(String(stdout))),
    );
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function stopProcess(child: NodeChildProcess.ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));

  // Windows has no signals: killing a shell-wrapped Metro reaps `cmd` and leaves the
  // node server holding the harness port, so the whole tree has to go explicitly.
  if (NodeProcess.platform === "win32" && child.pid !== undefined) {
    NodeChildProcess.spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    await Promise.race([exited, delay(5_000)]);
    return;
  }

  child.kill("SIGTERM");
  await Promise.race([exited, delay(5_000)]);
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGKILL");
  await Promise.race([exited, delay(1_000)]);
}

async function waitForPort(port: number, label = "Process", timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortInUse(port)) return;
    await delay(500);
  }
  throw new Error(`${label} did not begin listening on port ${port} within ${timeoutMs}ms.`);
}

function showcaseMetroEnv(): NodeJS.ProcessEnv {
  return {
    ...NodeProcess.env,
    ANDROID_HOME: ANDROID_SDK_ROOT,
    EXPO_NO_GIT_STATUS: "1",
    // Swaps the Supabase client for the fixture-backed stand-in, so the capture needs
    // no project, no local stack and no Docker.
    EXPO_PUBLIC_SHOWCASE: "1",
    // Never contacted. Only present because helpers such as `lib/storage-url.ts` read
    // the public env unconditionally.
    EXPO_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${SHOWCASE_CONTROL_PORT}`,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "showcase",
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "showcase",
    EXPO_PUBLIC_SUPABASE_ANON_KEY: "showcase",
    // Analytics and paywalls have no business in a screenshot.
    EXPO_PUBLIC_POSTHOG_KEY: "",
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "",
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "",
  };
}

async function isPortInUse(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const socket = NodeNet.createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

/**
 * A leftover Metro from an interrupted run still answers on the harness port, so
 * `expo start` quietly skips its own dev server and `waitForPort` is satisfied by the
 * stale one. The app then hangs on a blank screen until the scene timeout, 15 minutes
 * later, with nothing in the log to explain it. Refuse to start instead.
 */
async function assertMetroPortFree(port: number): Promise<void> {
  if (!(await isPortInUse(port))) return;
  throw new Error(
    `Port ${port} is already in use, most likely by Metro from an interrupted run. ` +
      `Stop it and retry, or pass --skip-metro to capture against the server already running there.`,
  );
}

function startMetro(config: ShowcaseConfig): NodeChildProcess.ChildProcess {
  return spawnProcess(
    PNPM,
    ["exec", "expo", "start", "--dev-client", "--port", String(config.metroPort)],
    { cwd: NATIVE_ROOT, env: showcaseMetroEnv() },
  );
}

async function buildIos(): Promise<string> {
  await runCommand(PNPM, ["exec", "expo", "prebuild", "--clean", "--platform", "ios"], {
    cwd: NATIVE_ROOT,
    env: showcaseMetroEnv(),
  });
  await runCommand(
    "xcodebuild",
    [
      "-workspace",
      NodePath.join(NATIVE_ROOT, `ios/${IOS_SCHEME}.xcworkspace`),
      "-scheme",
      IOS_SCHEME,
      "-configuration",
      "Debug",
      "-sdk",
      "iphonesimulator",
      "-derivedDataPath",
      IOS_DERIVED_DATA,
      "-quiet",
      `ARCHS=${NodeProcess.arch === "arm64" ? "arm64" : "x86_64"}`,
      "ONLY_ACTIVE_ARCH=YES",
      "build",
    ],
    { cwd: NATIVE_ROOT, env: showcaseMetroEnv() },
  );
  return IOS_APP_PATH;
}

/** Absolute: `cmd` does not reliably resolve a bare `gradlew.bat` from the cwd. */
function gradleWrapperPath(): string {
  return NodePath.join(
    NATIVE_ROOT,
    "android",
    NodeProcess.platform === "win32" ? "gradlew.bat" : "gradlew",
  );
}

async function buildAndroid(abis: readonly string[]): Promise<string> {
  await runCommand(PNPM, ["exec", "expo", "prebuild", "--clean", "--platform", "android"], {
    cwd: NATIVE_ROOT,
    env: showcaseMetroEnv(),
  });
  await runCommand(
    gradleWrapperPath(),
    [
      "app:assembleDebug",
      ...(abis.length > 0 ? [`-PreactNativeArchitectures=${abis.join(",")}`] : []),
      // Library modules build inside node_modules, and on Windows a daemon left over
      // from an earlier run keeps their output jars open, so the next run dies with
      // "Unable to delete file ... classes.jar". File-system watching is what retains
      // those handles; without it the daemon is still reused, just not as a lock.
      ...(NodeProcess.platform === "win32" ? ["-Dorg.gradle.vfs.watch=false"] : []),
    ],
    { cwd: NodePath.join(NATIVE_ROOT, "android"), env: showcaseMetroEnv() },
  );
  // The daemon keeps a multi-gigabyte heap and file handles inside node_modules for
  // nothing once the APK exists, and the emulator is about to want that memory. Also
  // spares the next run the locked-jar failure the daemon causes on Windows.
  await runCommand(gradleWrapperPath(), ["--stop"], {
    cwd: NodePath.join(NATIVE_ROOT, "android"),
    env: showcaseMetroEnv(),
  }).catch(() => undefined);
  return ANDROID_APK_PATH;
}

async function existingArtifact(path: string): Promise<string | null> {
  return await NodeFSP.access(path).then(
    () => path,
    () => null,
  );
}

async function finalizeCapture(destination: string, device: ShowcaseDevice): Promise<void> {
  const normalized = normalizeStorePng(await NodeFSP.readFile(destination));
  await NodeFSP.writeFile(destination, normalized);
  const metadata = validateStoreAsset(
    device.storeAsset,
    normalized,
    NodePath.basename(destination),
  );
  NodeProcess.stdout.write(
    `Captured ${NodePath.relative(REPO_ROOT, destination)} (${metadata.width}×${metadata.height}, 24-bit RGB, validated for ${device.storeAsset.store})\n`,
  );
}

async function validateCaptureSet(
  capture: ShowcaseCapture,
  outputDirectory: string,
  requireMinimum: boolean,
): Promise<void> {
  const directory = showcaseCaptureDirectory(outputDirectory, capture);
  const files = (await NodeFSP.readdir(directory)).filter((file) => file.endsWith(".png")).sort();
  const missingFiles = capture.scenes
    .map((scene) => `${scene}.png`)
    .filter((file) => !files.includes(file));
  if (missingFiles.length > 0) {
    throw new Error(`${capture.device.id} is missing ${missingFiles.join(", ")} in ${directory}.`);
  }
  validateStoreAssetCount(capture.device.storeAsset, files.length, requireMinimum);
  for (const file of files) {
    const bytes = await NodeFSP.readFile(NodePath.join(directory, file));
    validateStoreAsset(capture.device.storeAsset, bytes, `${capture.device.id}/${file}`);
  }
  NodeProcess.stdout.write(
    `Validated ${files.length} upload-ready ${capture.device.storeAsset.store} screenshots in ${NodePath.relative(REPO_ROOT, directory)}/\n`,
  );
}

async function renderCaptureFrames(
  capture: ShowcaseCapture,
  outputDirectory: string,
  config: ShowcaseConfig,
): Promise<void> {
  const source = showcaseCaptureDirectory(outputDirectory, capture);
  const destinationDirectory = showcaseCaptureDirectory(
    NodePath.resolve(REPO_ROOT, config.frames.outputDirectory),
    capture,
  );
  await NodeFSP.mkdir(destinationDirectory, { recursive: true });

  for (const scene of capture.scenes) {
    const framed = await renderFramedScreenshot({
      screenshot: await NodeFSP.readFile(NodePath.join(source, `${scene}.png`)),
      spec: capture.device.storeAsset,
      appearance: capture.appearance,
      caption: config.frames.captions[scene],
      frames: config.frames,
    });
    const destination = NodePath.join(destinationDirectory, `${scene}.png`);
    await NodeFSP.writeFile(destination, framed);
    validateStoreAsset(capture.device.storeAsset, framed, `framed ${capture.device.id}/${scene}`);
  }
  NodeProcess.stdout.write(
    `Framed ${capture.scenes.length} marketing images in ${NodePath.relative(REPO_ROOT, destinationDirectory)}/\n`,
  );
}

interface SimctlDevice {
  readonly name: string;
  readonly udid: string;
  readonly state: string;
  readonly isAvailable: boolean;
}

async function findIosSimulator(name: string): Promise<SimctlDevice | null> {
  const parsed = JSON.parse(
    await commandOutput("xcrun", ["simctl", "list", "devices", "available", "-j"]),
  ) as { readonly devices: Readonly<Record<string, readonly SimctlDevice[]>> };
  return (
    Object.entries(parsed.devices)
      .filter(([runtime]) => runtime.includes("iOS"))
      .flatMap(([, devices]) => devices)
      .filter((device) => device.isAvailable && device.name === name)
      .at(-1) ?? null
  );
}

async function ensureIosSimulator(device: ShowcaseIosDevice): Promise<{
  readonly simulator: SimctlDevice;
  readonly createdByRunner: boolean;
}> {
  const existing = await findIosSimulator(device.simulator);
  if (existing) return { simulator: existing, createdByRunner: false };
  if (!device.simulatorDeviceType) {
    throw new Error(
      `iOS simulator '${device.simulator}' is not installed and has no simulatorDeviceType configured.`,
    );
  }
  const udid = (
    await commandOutput("xcrun", ["simctl", "create", device.simulator, device.simulatorDeviceType])
  ).trim();
  if (!udid) throw new Error(`Could not create iOS simulator '${device.simulator}'.`);
  return {
    simulator: { name: device.simulator, udid, state: "Shutdown", isAvailable: true },
    createdByRunner: true,
  };
}

async function normalizeIosSimulator(appearance: ShowcaseAppearance, udid: string): Promise<void> {
  await runCommand("xcrun", ["simctl", "ui", udid, "appearance", appearance]);
  await runCommand("xcrun", [
    "simctl",
    "status_bar",
    udid,
    "override",
    "--time",
    "9:41",
    "--batteryState",
    "charged",
    "--batteryLevel",
    "100",
    "--wifiBars",
    "3",
    "--cellularBars",
    "4",
  ]);
}

async function captureIos(
  capture: ShowcaseCapture & { readonly device: ShowcaseIosDevice },
  appPath: string | null,
  outputDirectory: string,
  config: ShowcaseConfig,
  control: Awaited<ReturnType<typeof startShowcaseControlServer>>,
  registerCleanup: (cleanup: IosCaptureCleanup) => void,
): Promise<void> {
  const { simulator, createdByRunner } = await ensureIosSimulator(capture.device);
  const startedByRunner = simulator.state !== "Booted";
  registerCleanup({ udid: simulator.udid, startedByRunner, createdByRunner });
  if (!startedByRunner) {
    // Clear transient SpringBoard state (permission prompts, stale URL-open
    // confirmations, keyboards) without erasing the developer's simulator.
    await runCommand("xcrun", ["simctl", "shutdown", simulator.udid]);
  }
  await runCommand("xcrun", ["simctl", "boot", simulator.udid]);
  await runCommand("xcrun", ["simctl", "bootstatus", simulator.udid, "-b"]);
  await normalizeIosSimulator(capture.appearance, simulator.udid);
  if (appPath) {
    await runCommand("xcrun", ["simctl", "uninstall", simulator.udid, APP_ID]).catch(
      () => undefined,
    );
    await runCommand("xcrun", ["simctl", "install", simulator.udid, appPath]);
  }

  for (const [key, value] of [
    ["EXDevMenuIsOnboardingFinished", "true"],
    ["EXDevMenuShowFloatingActionButton", "false"],
    ["EXDevMenuShowsAtLaunch", "false"],
  ] as const) {
    await runCommand("xcrun", [
      "simctl",
      "spawn",
      simulator.udid,
      "defaults",
      "write",
      APP_ID,
      key,
      "-bool",
      value,
    ]).catch(() => undefined);
  }

  const firstScene = capture.scenes[0]!;
  control.requestScene(firstScene);
  const metroUrl = encodeURIComponent(`http://127.0.0.1:${config.metroPort}`);
  await runCommand("xcrun", [
    "simctl",
    "openurl",
    simulator.udid,
    `${APP_SCHEME}://expo-development-client/?url=${metroUrl}`,
  ]);

  for (const [sceneIndex, scene] of capture.scenes.entries()) {
    if (sceneIndex > 0) control.requestScene(scene);
    await control.waitForScene(scene, sceneIndex === 0 ? FIRST_SCENE_TIMEOUT_MS : 120_000);
    await delay(config.settleDelayMs);
    const destination = NodePath.join(
      showcaseCaptureDirectory(outputDirectory, capture),
      `${scene}.png`,
    );
    await runCommand("xcrun", ["simctl", "io", simulator.udid, "screenshot", destination]);
    await finalizeCapture(destination, capture.device);
  }
}

function androidSdkTool(relativePath: string): string {
  return NodePath.join(ANDROID_SDK_ROOT, `${relativePath}${EXECUTABLE_SUFFIX}`);
}

async function adbOutput(serial: string, args: readonly string[]): Promise<string> {
  return await commandOutput(androidSdkTool("platform-tools/adb"), ["-s", serial, ...args]);
}

async function runAdb(serial: string, args: readonly string[]): Promise<void> {
  await runCommand(androidSdkTool("platform-tools/adb"), ["-s", serial, ...args]);
}

async function runningAndroidAvds(): Promise<ReadonlyMap<string, string>> {
  const devices = (await commandOutput(androidSdkTool("platform-tools/adb"), ["devices"]))
    .split("\n")
    .map((line) => line.trim().split(/\s+/u))
    .filter((parts) => parts[0]?.startsWith("emulator-") && parts[1] === "device")
    .map((parts) => parts[0] as string);
  const result = new Map<string, string>();
  for (const serial of devices) {
    const avdName = (await adbOutput(serial, ["emu", "avd", "name"])).split("\n")[0]?.trim();
    if (avdName) result.set(avdName, serial);
  }
  return result;
}

async function waitForAndroidSerial(avd: string, timeoutMs = 180_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const serial = (await runningAndroidAvds()).get(avd);
    if (serial) {
      await runAdb(serial, ["wait-for-device"]);
      const bootCompleted = (
        await adbOutput(serial, ["shell", "getprop", "sys.boot_completed"])
      ).trim();
      if (bootCompleted === "1") return serial;
    }
    await delay(1_000);
  }
  throw new Error(`Android AVD '${avd}' did not finish booting within ${timeoutMs}ms.`);
}

async function normalizeAndroidEmulator(
  device: ShowcaseAndroidDevice,
  appearance: ShowcaseAppearance,
  serial: string,
): Promise<void> {
  for (const scale of [
    "window_animation_scale",
    "transition_animation_scale",
    "animator_duration_scale",
  ]) {
    await runAdb(serial, ["shell", "settings", "put", "global", scale, "0"]);
  }
  await runAdb(serial, ["shell", "cmd", "uimode", "night", appearance === "dark" ? "yes" : "no"]);
  await runAdb(serial, ["shell", "settings", "put", "system", "time_12_24", "12"]);
  await runAdb(serial, ["emu", "power", "capacity", "100"]).catch(() => undefined);
  await runAdb(serial, ["shell", "settings", "put", "global", "sysui_demo_allowed", "1"]);
  const demo = (extras: readonly string[]) =>
    runAdb(serial, [
      "shell",
      "am",
      "broadcast",
      "-a",
      "com.android.systemui.demo",
      "-e",
      "command",
      ...extras,
    ]).catch(() => undefined);
  await demo(["enter"]);
  await demo(["clock", "-e", "hhmm", "0941"]);
  await demo(["battery", "-e", "level", "100", "-e", "plugged", "false"]);
  if (device.viewport) {
    await runAdb(serial, [
      "shell",
      "wm",
      "size",
      `${device.viewport.width}x${device.viewport.height}`,
    ]);
    if (device.viewport.density) {
      await runAdb(serial, ["shell", "wm", "density", String(device.viewport.density)]);
    }
  }
}

async function prepareAndroidShowcaseApp(serial: string): Promise<void> {
  const preferences = `<?xml version="1.0" encoding="utf-8" standalone="yes" ?>
<map>
  <boolean name="isOnboardingFinished" value="true" />
  <boolean name="showsAtLaunch" value="false" />
  <boolean name="showFab" value="false" />
  <boolean name="motionGestureEnabled" value="false" />
  <boolean name="touchGestureEnabled" value="false" />
  <boolean name="keyCommandsEnabled" value="false" />
</map>`;
  const encoded = Buffer.from(preferences).toString("base64");
  await runAdb(serial, [
    "shell",
    `run-as ${APP_ID} sh -c 'mkdir -p shared_prefs && printf %s ${encoded} | base64 -d > shared_prefs/expo.modules.devmenu.sharedpreferences.xml'`,
  ]).catch(() => undefined);
}

async function captureAndroid(
  capture: ShowcaseCapture & { readonly device: ShowcaseAndroidDevice },
  apkPath: string | null,
  outputDirectory: string,
  config: ShowcaseConfig,
  control: Awaited<ReturnType<typeof startShowcaseControlServer>>,
  registerCleanup: (cleanup: AndroidCaptureCleanup) => void,
): Promise<void> {
  const running = await runningAndroidAvds();
  const existingSerial = running.get(capture.device.avd);
  const startedByRunner = !existingSerial;
  let launchedEmulator: NodeChildProcess.ChildProcess | null = null;

  if (startedByRunner) {
    const installedAvds = (await commandOutput(androidSdkTool("emulator/emulator"), ["-list-avds"]))
      .split("\n")
      .map((value) => value.trim());
    if (!installedAvds.includes(capture.device.avd)) {
      throw new Error(
        `Android AVD '${capture.device.avd}' is not installed. Run 'emulator -list-avds' and set WISHLANE_SHOWCASE_AVD.`,
      );
    }
    launchedEmulator = spawnProcess(
      androidSdkTool("emulator/emulator"),
      [
        "-avd",
        capture.device.avd,
        "-no-snapshot-load",
        "-no-boot-anim",
        // AVDs are commonly created with 2 GB, which the dev client outgrows: Android's
        // low-memory killer reaps the app seconds after launch and the capture then
        // waits on an empty screen. Overriding here keeps the AVD's own config alone.
        "-memory",
        String(ANDROID_EMULATOR_MEMORY_MB),
      ],
      { stdio: "ignore", detached: true },
    );
    launchedEmulator.unref();
  }

  const serial =
    existingSerial ??
    (await waitForAndroidSerial(capture.device.avd).catch(async (error: unknown) => {
      if (launchedEmulator) await stopProcess(launchedEmulator);
      throw error;
    }));
  registerCleanup({ device: capture.device, serial, startedByRunner });
  await normalizeAndroidEmulator(capture.device, capture.appearance, serial);
  if (apkPath) await runAdb(serial, ["install", "-r", apkPath]);
  await runAdb(serial, ["shell", "pm", "clear", APP_ID]).catch(() => undefined);
  await prepareAndroidShowcaseApp(serial);
  // The control channel also serves the fixture imagery, so both scene switching and
  // every image in a capture ride the same reverse tunnel.
  for (const port of [config.metroPort, SHOWCASE_CONTROL_PORT]) {
    await runAdb(serial, ["reverse", `tcp:${port}`, `tcp:${port}`]);
  }

  // The reverse tunnel accepts connections whether or not anything answers on the
  // host, so a dead bundler reaches the app as a truncated HTTP response instead of a
  // refused connection. Checking here names the cause rather than timing out blank.
  if (!(await isPortInUse(config.metroPort))) {
    throw new Error(
      `Nothing is listening on Metro port ${config.metroPort}; the bundler died before the app launched.`,
    );
  }

  const firstScene = capture.scenes[0]!;
  control.requestScene(firstScene);
  const metroUrl = encodeURIComponent(`http://127.0.0.1:${config.metroPort}`);
  await runAdb(serial, [
    "shell",
    "am",
    "start",
    "-W",
    // Without -S an app left running on a reused emulator swallows the intent as an
    // ordinary onNewIntent ("delivered to currently running top-most instance") and
    // keeps whatever bundle it already had, so the capture waits on a blank screen.
    "-S",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `${APP_SCHEME}://expo-development-client/?url=${metroUrl}`,
    APP_ID,
  ]);

  for (const [sceneIndex, scene] of capture.scenes.entries()) {
    if (sceneIndex > 0) control.requestScene(scene);
    await control.waitForScene(scene, sceneIndex === 0 ? FIRST_SCENE_TIMEOUT_MS : 120_000);
    await delay(config.settleDelayMs);
    const destination = NodePath.join(
      showcaseCaptureDirectory(outputDirectory, capture),
      `${scene}.png`,
    );
    const png = await new Promise<Buffer>((resolve, reject) => {
      NodeChildProcess.execFile(
        androidSdkTool("platform-tools/adb"),
        ["-s", serial, "exec-out", "screencap", "-p"],
        { cwd: REPO_ROOT, encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
        (error, stdout) => (error ? reject(error) : resolve(stdout as unknown as Buffer)),
      );
    });
    await NodeFSP.writeFile(destination, png);
    await finalizeCapture(destination, capture.device);
  }
}

async function cleanupAndroidViewport(
  device: ShowcaseAndroidDevice,
  serial: string,
): Promise<void> {
  await runAdb(serial, [
    "shell",
    "am",
    "broadcast",
    "-a",
    "com.android.systemui.demo",
    "-e",
    "command",
    "exit",
  ]).catch(() => undefined);
  if (!device.viewport) return;
  await runAdb(serial, ["shell", "wm", "size", "reset"]).catch(() => undefined);
  if (device.viewport.density) {
    await runAdb(serial, ["shell", "wm", "density", "reset"]).catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const options = parseShowcaseCliArgs(NodeProcess.argv.slice(2));
  if (options.list) {
    printUsage(showcaseConfig);
    return;
  }

  const captures = planShowcaseCaptures(showcaseConfig, options);
  const outputDirectory = NodePath.resolve(REPO_ROOT, showcaseConfig.outputDirectory);

  if (options.validateOnly) {
    for (const capture of captures) {
      await validateCaptureSet(
        capture,
        outputDirectory,
        capture.scenes.length === capture.device.scenes.length,
      );
    }
    return;
  }

  const hasIos = captures.some((capture) => capture.device.platform === "ios");
  if (hasIos && NodeProcess.platform !== "darwin") {
    throw new Error(
      "iOS captures need macOS and Xcode. Use --platform android locally, or run the Showcase Screenshots workflow for the App Store set.",
    );
  }
  const hasAndroid = captures.some((capture) => capture.device.platform === "android");

  for (const capture of captures) {
    const directory = showcaseCaptureDirectory(outputDirectory, capture);
    await NodeFSP.rm(directory, { recursive: true, force: true });
    await NodeFSP.mkdir(directory, { recursive: true });
  }

  const control = await startShowcaseControlServer();
  let metro: NodeChildProcess.ChildProcess | null = null;
  const iosCleanups: IosCaptureCleanup[] = [];
  const androidCleanups: AndroidCaptureCleanup[] = [];

  try {
    // Fail before a ten-minute build rather than after it.
    if (!options.skipMetro) await assertMetroPortFree(showcaseConfig.metroPort);

    const iosAppPath = hasIos
      ? options.skipBuild
        ? await existingArtifact(IOS_APP_PATH)
        : await buildIos()
      : null;
    const androidAbis = captures.flatMap((capture) =>
      capture.device.platform === "android" && capture.device.abi ? [capture.device.abi] : [],
    );
    const androidApkPath = hasAndroid
      ? options.skipBuild
        ? await existingArtifact(ANDROID_APK_PATH)
        : await buildAndroid([...new Set(androidAbis)])
      : null;

    // Only now: `expo prebuild --clean` deletes and regenerates the native directory,
    // and doing that under Metro's file watcher corrupts its file map and can take the
    // dev server down. The app then gets an empty reply through the adb reverse tunnel
    // ("unexpected end of stream on http://127.0.0.1:<port>") and never boots. Nothing
    // before this point needs a bundler.
    if (!options.skipMetro) {
      metro = startMetro(showcaseConfig);
      // A cold file-map crawl on Windows runs well past the default wait.
      await waitForPort(showcaseConfig.metroPort, "Metro", 300_000);
    }

    for (const capture of captures) {
      if (capture.device.platform === "ios") {
        await captureIos(
          capture as ShowcaseCapture & { readonly device: ShowcaseIosDevice },
          iosAppPath,
          outputDirectory,
          showcaseConfig,
          control,
          (cleanup) => iosCleanups.push(cleanup),
        );
      } else {
        await captureAndroid(
          capture as ShowcaseCapture & { readonly device: ShowcaseAndroidDevice },
          androidApkPath,
          outputDirectory,
          showcaseConfig,
          control,
          (cleanup) => androidCleanups.push(cleanup),
        );
      }
      await validateCaptureSet(
        capture,
        outputDirectory,
        capture.scenes.length === capture.device.scenes.length,
      );
      if (!options.skipFrames) {
        await renderCaptureFrames(capture, outputDirectory, showcaseConfig);
      }
    }

    NodeProcess.stdout.write(
      `\nDone. Upload-ready screenshots are in ${showcaseConfig.outputDirectory}/${options.skipFrames ? "" : `, framed marketing images in ${showcaseConfig.frames.outputDirectory}/`}\n`,
    );
  } finally {
    if (options.keepRunning) {
      metro?.unref();
    } else {
      for (const cleanup of androidCleanups) {
        await cleanupAndroidViewport(cleanup.device, cleanup.serial);
        if (cleanup.startedByRunner) {
          await runAdb(cleanup.serial, ["emu", "kill"]).catch(() => undefined);
        }
      }
      for (const cleanup of iosCleanups) {
        if (cleanup.startedByRunner || cleanup.createdByRunner) {
          await runCommand("xcrun", ["simctl", "shutdown", cleanup.udid]).catch(() => undefined);
        }
        if (cleanup.createdByRunner) {
          await runCommand("xcrun", ["simctl", "delete", cleanup.udid]).catch(() => undefined);
        }
      }
      if (metro) await stopProcess(metro);
    }
    await control.close();
  }
}

if (import.meta.main) {
  void main().catch((error: unknown) => {
    // Stack over message: the harness mostly fails unattended, where the line that
    // threw is the whole diagnosis.
    NodeProcess.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
    );
    NodeProcess.exit(1);
  });
}
