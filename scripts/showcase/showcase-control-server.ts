import * as NodeFSP from "node:fs/promises";
import * as NodeHttp from "node:http";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import sharp from "sharp";

import {
  isShowcaseScene,
  SHOWCASE_CONTROL_PORT,
  type ShowcaseScene,
} from "../../packages/backend/supabase/showcase/constants.ts";

const ASSETS_ROOT = NodePath.resolve(
  NodePath.dirname(NodeURL.fileURLToPath(import.meta.url)),
  "assets",
);

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export interface ShowcaseControlServer {
  /** Ask the app to navigate to a scene and forget any previous readiness. */
  requestScene(scene: ShowcaseScene): void;
  /** Resolves once the app reports that scene is rendered and idle. */
  waitForScene(scene: ShowcaseScene, timeoutMs?: number): Promise<void>;
  close(): Promise<void>;
}

const SKIN_TONES = [
  ["#F2C7A5", "#E5B38E"],
  ["#D99B73", "#C9855E"],
  ["#B96F4C", "#A85E3E"],
  ["#8E5137", "#79422D"],
] as const;

const HAIR_COLORS = ["#2D2D2F", "#3B2922", "#171719", "#68412E"] as const;

const HAIR_STYLES = [
  `<path d="M174 205 Q166 122 238 102 Q315 100 345 156 Q354 196 329 230 Q281 212 238 163 Q220 193 207 238Z" fill="HAIR" />`,
  `<path d="M158 238 Q153 107 256 94 Q359 106 354 238 L329 342 Q317 289 316 176 Q260 137 193 178 Q194 286 180 342Z" fill="HAIR" />
   <path d="M181 181 Q211 104 295 113 Q341 123 345 178 Q299 170 255 136 Q226 172 181 208Z" fill="HAIR" />`,
  `<path d="M171 195 Q164 119 225 103 Q239 82 269 100 Q301 82 315 110 Q354 127 341 199 Q316 171 286 180 Q258 149 232 179 Q198 166 171 195Z" fill="HAIR" />`,
  `<path d="M166 210 Q160 111 250 98 Q346 101 348 210 L326 318 Q313 274 315 176 Q256 138 195 176 Q198 272 184 318Z" fill="HAIR" />
   <path d="M177 189 Q208 105 299 112 Q340 129 344 184 Q300 177 263 145 Q230 184 177 211Z" fill="HAIR" />`,
  `<path d="M175 184 Q182 108 255 101 Q329 107 338 184 Q299 153 256 153 Q212 153 175 184Z" fill="HAIR" />`,
  `<circle cx="256" cy="83" r="58" fill="HAIR" />
   <path d="M166 214 Q158 117 247 101 Q339 106 347 214 L325 313 Q311 263 314 177 Q255 139 195 177 Q198 263 183 313Z" fill="HAIR" />`,
] as const;

const FACIAL_HAIR = [
  `<path d="M180 255 Q188 346 256 361 Q324 346 332 255 Q318 326 288 310 Q256 292 224 310 Q194 326 180 255Z" fill="HAIR" />
   <path d="M241 332 Q256 311 271 332Z" fill="#FFFFFF" />`,
  "",
  `<path d="M196 292 Q210 345 256 354 Q302 345 316 292 Q290 319 256 305 Q222 319 196 292Z" fill="HAIR" />`,
  "",
  `<path d="M192 274 Q204 344 256 357 Q308 344 320 274 Q295 318 256 307 Q217 318 192 274Z" fill="HAIR" />`,
  "",
] as const;

const AVATAR_STYLE_BY_SEED: Readonly<Record<string, number>> = {
  AM: 0,
  JC: 4,
  PS: 5,
  SC: 0,
  RM: 3,
  DO: 2,
  NP: 1,
};

const AVATAR_SKIN_BY_SEED: Readonly<Record<string, number>> = {
  AM: 0,
  JC: 1,
  PS: 2,
  SC: 0,
  RM: 1,
  DO: 2,
  NP: 2,
};

function avatarVariant(seed: string): number {
  let total = 0;
  for (const character of seed) total = (total * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  return total;
}

export function buildShowcaseAvatarSvg(
  initials: string,
  background: string,
  shirt: string,
): string {
  const variant = avatarVariant(initials);
  const skinIndex = AVATAR_SKIN_BY_SEED[initials] ?? variant % SKIN_TONES.length;
  const [skin, skinShade] = SKIN_TONES[skinIndex] ?? SKIN_TONES[0];
  const hair = HAIR_COLORS[(variant >>> 2) % HAIR_COLORS.length] ?? HAIR_COLORS[0];
  const styleIndex =
    AVATAR_STYLE_BY_SEED[initials] ?? ((variant >>> 5) ^ variant) % HAIR_STYLES.length;
  const hairStyle = (HAIR_STYLES[styleIndex] ?? HAIR_STYLES[0]).replaceAll("HAIR", hair);
  const facialHair = (FACIAL_HAIR[styleIndex] ?? "").replaceAll("HAIR", hair);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <clipPath id="face"><rect x="174" y="112" width="164" height="240" rx="82" /></clipPath>
  </defs>
  <rect width="512" height="512" fill="${background}" />
  ${styleIndex === 1 || styleIndex === 3 || styleIndex === 5 ? hairStyle.split("\n")[0] : ""}
  <circle cx="170" cy="239" r="31" fill="${skin}" />
  <circle cx="342" cy="239" r="31" fill="${skinShade}" />
  <path d="M218 319 H294 V398 H218Z" fill="${skin}" />
  <path d="M256 319 H294 V398 H256Z" fill="${skinShade}" />
  <path d="M80 512 L102 420 Q112 399 218 374 Q224 418 256 420 Q288 418 294 374 Q400 399 410 420 L432 512Z" fill="${shirt}" />
  <path d="M208 377 Q218 429 256 431 Q294 429 304 377 L321 383 Q307 453 256 455 Q205 453 191 383Z" fill="#000000" fill-opacity="0.16" />
  <rect x="174" y="112" width="164" height="240" rx="82" fill="${skin}" />
  <rect x="256" y="112" width="82" height="240" fill="${skinShade}" clip-path="url(#face)" />
  ${hairStyle}
  ${facialHair}
</svg>`;
}

/**
 * Flat vector portraits inspired by classic geometric avatar systems. Each person's
 * initials seed their skin tone, hair and silhouette, so the cast is varied but stable
 * across devices and capture runs without shipping third-party artwork.
 */
export async function renderShowcaseAvatar(
  initials: string,
  from: string,
  to: string,
): Promise<Buffer> {
  const svg = buildShowcaseAvatarSvg(initials, from, to);
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Hands a scene to the app, reads readiness back, and serves the fixture imagery the
 * showcase rows point at. An HTTP channel needs no native code and behaves identically
 * on the iOS Simulator (shared loopback) and the Android emulator (`adb reverse`).
 */
export async function startShowcaseControlServer(
  port = SHOWCASE_CONTROL_PORT,
): Promise<ShowcaseControlServer> {
  let requestedScene: ShowcaseScene | null = null;
  let readyScene: ShowcaseScene | null = null;

  const server = NodeHttp.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/scene") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ scene: requestedScene }));
      return;
    }
    if (request.method === "POST" && url.pathname === "/ready") {
      let body = "";
      request.on("data", (chunk) => (body += String(chunk)));
      request.on("end", () => {
        try {
          const scene = (JSON.parse(body) as { scene?: unknown }).scene;
          if (isShowcaseScene(scene)) readyScene = scene;
        } catch {
          // A malformed report just leaves the scene un-ready until the app retries.
        }
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true }));
      });
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/avatars/")) {
      const initials = decodeURIComponent(NodePath.basename(url.pathname, ".png"));
      void renderShowcaseAvatar(
        initials,
        url.searchParams.get("from") ?? "#F9A8D4",
        url.searchParams.get("to") ?? "#DB2777",
      )
        .then((png) => {
          response.writeHead(200, { "content-type": "image/png" });
          response.end(png);
        })
        .catch(() => response.writeHead(500).end());
      return;
    }
    if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
      // Resolve inside the assets root so a traversing path cannot read the repository.
      const file = NodePath.resolve(ASSETS_ROOT, `.${url.pathname.slice("/assets".length)}`);
      if (!file.startsWith(ASSETS_ROOT)) {
        response.writeHead(403).end();
        return;
      }
      void NodeFSP.readFile(file)
        .then((bytes) => {
          response.writeHead(200, {
            "content-type":
              CONTENT_TYPES[NodePath.extname(file).toLowerCase()] ?? "application/octet-stream",
          });
          response.end(bytes);
        })
        .catch(() => response.writeHead(404).end());
      return;
    }
    response.writeHead(404).end();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    requestScene(scene) {
      requestedScene = scene;
      readyScene = null;
    },
    async waitForScene(scene, timeoutMs = 180_000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (readyScene === scene) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error(`Showcase scene '${scene}' did not report ready within ${timeoutMs}ms.`);
    },
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}
