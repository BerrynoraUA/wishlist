# App-store screenshot showcase

The showcase harness photographs the **real Wishlane app** running against checked-in
sample data. No screenshot-only screen recreates application UI.
`EXPO_PUBLIC_SHOWCASE=1` does two things: it swaps the Supabase client for a
fixture-backed stand-in that answers the app's normal queries from
[`packages/backend/supabase/showcase/`](../packages/backend/supabase/showcase/), and it
enables a non-rendering coordinator that navigates the production routes and reports
when a route has finished fetching. There is no database, no local stack and no Docker
anywhere in the loop.

## Capture the default matrix

From the repository root:

    pnpm screenshots

The command:

1. Starts an isolated Metro server on port 8199 and a control server on port 8299. The
   control server hands scenes to the app, reads readiness back, and serves the fixture
   imagery the sample rows point at.
2. Builds the selected native apps with a clean Expo prebuild and boots each device.
3. Asks the app for each scene in turn, waits for it to report ready, and captures.
4. Sets the requested system appearance, normalises status bars, converts captures to
   24-bit RGB PNGs without alpha, and validates dimensions, aspect ratio, file size and
   screenshot count before succeeding.
5. Writes upload-ready folders under `apps/native/artifacts/screenshots/` and captioned
   marketing versions under `apps/native/artifacts/framed/`.

Metro and any device the runner started are cleaned up afterwards. Pass
`--keep-running` to leave them up.

## The matrix

| Output folder                     | Capture target       | Upload dimensions | Store slot                        |
| --------------------------------- | -------------------- | ----------------- | --------------------------------- |
| `apple/iphone-6.9/{light,dark}/`  | iPhone 17 Pro Max    | 1320×2868         | App Store Connect iPhone 6.9-inch |
| `apple/iphone-6.5/{light,dark}/`  | iPhone 14 Plus       | 1284×2778         | App Store Connect iPhone 6.5-inch |
| `google-play/phone/{light,dark}/` | Pixel AVD at 420 dpi | 1080×1920         | Google Play phone, portrait 9:16  |

Phones only: the app has no tablet layouts yet, so `ios.supportsTablet` is `false` in
`apps/native/app.json` and there is no iPad slot to fill.

Each target captures four scenes — `wishlists`, `wishlist`, `friends` and
`secret-santa` — producing 12 PNGs for one appearance or 24 for both, plus the same
count again in the framed set. Four avoids low-value settings imagery while satisfying
Apple's 1–10 limit and Google's phone requirement of 2–8.

## When tablets ship

The two Google Play tablet slots are already defined in
[showcase.config.ts](../scripts/showcase/showcase.config.ts) and are skipped only by a
flag. Both reuse the phone AVD and change nothing but the reported viewport, so no
extra emulator image is needed. Capture them with:

    WISHLANE_SHOWCASE_TABLETS=1 pnpm screenshots --platform android

Set `CAPTURE_TABLETS` to default `true` in that file to make them part of every run.
They add `google-play/tablet-7/` (1080×1920 at 288 dpi) and `google-play/tablet-10/`
(1440×2560 at 288 dpi), each with a Google Play slot minimum of 4.

The generated tree is aligned with the store upload fields:

    apps/native/artifacts/
    ├── screenshots/            # bare captures, upload these
    │   ├── apple/iphone-{6.9,6.5}/{light,dark}/{wishlists,wishlist,friends,secret-santa}.png
    │   └── google-play/{phone,tablet-7,tablet-10}/{light,dark}/…
    ├── framed/                 # same names, gradient background + caption
    │   ├── apple/…
    │   └── google-play/…
    └── ios-derived-data/       # simulator build the iOS captures run against

`apps/native/artifacts/` holds everything the harness generates and nothing that
belongs in git. It is ignored by both `.gitignore` and `.easignore`, so a capture never
shows up as pending changes and never rides along in an EAS build archive.

Framed images keep the exact store dimensions, so they can be uploaded directly when a
captioned listing is wanted instead of bare screenshots. Captions, background colours
and the caption font live in
[showcase.config.ts](../scripts/showcase/showcase.config.ts).

## Fast iteration

Capture one scene or device:

    pnpm screenshots --device pixel --scene wishlist
    pnpm screenshots --platform android --scene friends

Override the configured appearance:

    pnpm screenshots --appearance dark
    pnpm screenshots --appearance both

Reuse the native build and leave the device up afterwards:

    pnpm screenshots --device pixel --skip-build --keep-running

Skip the framed set, list the matrix, or validate existing files without touching any
device:

    pnpm screenshots --no-frames
    pnpm screenshots --list
    pnpm screenshots --validate-only

Capture fails when a PNG is the wrong size, has alpha, is not 8-bit RGB, exceeds the
configured file-size limit, violates Google Play's 9:16 shape, or leaves a full output
set below its store minimum. The harness is the source of truth for upload
dimensions — do not resize its output. If store rules change, update the target's
`storeAsset` specification.

## Windows and iOS

iOS capture needs macOS and Xcode; running `--platform ios` anywhere else fails with a
clear message. On Windows, capture Android locally and produce the App Store set with
the **Showcase Screenshots** workflow (Actions tab → choose `all`, `ios` or `android`,
and `light`, `dark` or `both`). Both jobs upload their PNGs even when a later capture
fails, so a partial run is still useful for diagnosis.

Neither job needs credentials, a database or a Docker daemon.

## Customising the sample data

- People, wishlists, items, prices, friendships and the Secret Santa event:
  [data.ts](../packages/backend/supabase/showcase/data.ts)
- Which queries the stand-in answers:
  [client.ts](../packages/backend/supabase/showcase/client.ts)
- Scenes, ids and the control/asset origin shared with the runner:
  [constants.ts](../packages/backend/supabase/showcase/constants.ts)
- Device matrix, scenes, captions and frame styling:
  [showcase.config.ts](../scripts/showcase/showcase.config.ts)
- Simulator/emulator orchestration:
  [showcase.ts](../scripts/showcase/showcase.ts)

Fixture timestamps are generated relative to app launch, so every route shows stable
relative labels ("in 3 weeks") without any stored dates going stale. Wishlist covers
and item images are checked-in Unsplash photographs, cropped tightly around the kind of
subject a shopper would actually save; the control server serves them over the same
loopback tunnel the scene channel uses, so runs stay offline-safe and the files never
ship in a production build. Avatars are gradient initials rendered on demand rather
than synthetic faces.

Two app-side details keep captures clean: the fixture profiles have
`userGuideStep = 15`, which is `USER_GUIDE_COMPLETE_STEP`, so the onboarding coach
marks never appear; and `NotificationPushBootstrap` skips permission registration and
the permission sheet entirely while `EXPO_PUBLIC_SHOWCASE=1`, so no OS dialog lands on
a screenshot. Themes are driven purely by the device appearance — the fixture settings
use `theme = 'system'`.

## Local prerequisites

- Android: `ANDROID_HOME`, `adb`, `emulator`, and an AVD. Set `WISHLANE_SHOWCASE_AVD`
  if yours is not named `Pixel_10_Pro_XL`, and `WISHLANE_SHOWCASE_ANDROID_ABI` if
  it is not `x86_64`.
- iOS (macOS only): Xcode command-line tools, the configured simulator runtimes, and
  CocoaPods.

Unit tests for the pure parts of the harness — CLI parsing, capture planning, store
validation, frame layout and scene routing — run with `pnpm test:scripts`.
