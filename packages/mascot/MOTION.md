# MOTION.md: the Wishlane mascot

The mascot is a padlock. These notes follow the `rossark-motion-skill` method: drawn things feel alive without getting busy, nothing teleports, reduced motion means still, nothing runs unseen.

## How it works

- `source/` holds the flat art, one 640×640 image per pose.
- `scripts/build_atlases.py` cuts each pose into parts (eyes, pupils, brows, mouth, hands, props, the shackle) and packs them into one atlas image per pose, so a mascot loads as one download. It writes the atlases to both apps and `src/layout.generated.ts`. It fails if the parts, stacked at rest, stop matching the source art.
- `src/motion.ts` says what each pose does: one function of time per layer and channel. **This is the file to edit to change an animation.**
- Both apps keep a mascot hidden until its image is ready, so it never pops in piece by piece.
- `src/bake.ts` samples those functions into number tables. The web plays them with the Animations API (`apps/frontend/src/components/ui/Mascot`), native reads them from a worklet (`apps/native/components/shared/animated-mascot.tsx`). There is one definition of the motion, on purpose.

`apps/frontend/public/mascot/*.webp` are flat copies only for the MCP widget, which can't stack layers.

## What each pose means

Every pose acts out why it's on screen. One main action per loop; everything else only breathes.

| Pose                  | Where it shows                  | The action                                                           |
| --------------------- | ------------------------------- | -------------------------------------------------------------------- |
| `welcome-wave`        | Log in                          | The hand really waves, with its motion ticks only while it does      |
| `excited-cheer`       | Sign up, landing hero           | Two hops, fists pumping in turn, stars twinkling after the landings  |
| `happy-pointing-down` | Sign in, landing CTA            | Fingers jab at the buttons below; the eyes check them, then you      |
| `hands-over-eyes`     | Typing a password               | Giggles behind its hands, which never open                           |
| `peeking`             | Password shown                  | One hand drops and the eye sneaks a look at the field                |
| `sad-alone`           | Nobody else here, sign-in error | Looks one way, then the other. Nobody's there, so it sighs and sinks |
| `gift-in-hands`       | No wishlists or items yet       | Peeks in the empty box, jiggles the flap, looks up, hopeful          |
| `magnifying-glass`    | No search results               | The lens sweeps out and across; the eyes hunt after it. No luck      |
| `explorer-map`        | Discover is empty               | Reads the map line by line, rustles it, lowers it to look at you     |
| `sleeping-bell`       | No notifications                | Slow breaths, the bell rocking with them, z's drifting up            |
| `lightbulb-idea`      | No ideas yet                    | Stares at the dark bulb, it flickers on, the whole body jumps        |
| `santa-sack`          | No Secret Santa events          | Heaves the sack, lets it thump, the pompom swings after              |
| `holding-key`         | Nobody has access               | Turns the key and its own shackle clicks open, then shuts            |
| `empty-hands-shrug`   | Nothing to show                 | A real shrug: hands up, head tipped, then it drops and settles       |

## Rules for this mascot

- **The action plays once, then it rests.** `QUIET` in `motion.ts` makes each loop three times longer than its action, so the big move returns only every 12–24 seconds. In between it breathes and blinks.
- **Save sad for real disappointment.** A first-time empty screen is an invitation, so it's hopeful.
- **The eyes, cheeks and gift are redrawn on purpose.** The art's highlights varied per pose, so the generator draws every open eye the same way. It adds a pink cheek, and turns the brown gift brand pink. The check against the art skips these. `LOCKS` in the generator evens out each pose's size and position.
- **Frame 0 is the art.** A pose's `still` moment (time 0 unless it says otherwise) must look like its source drawing: that's what reduced motion shows and what the page paints first. `lightbulb-idea` is the exception that needs `still`, since its loop starts with the bulb off.
- **A blink is a squash into a curve.** The eye scales shut while a curved lid, matching the sleeping pose, fades in over it.
- **Parts that reach past the body go behind it.** Arms, the shackle and the back panel are layers under the body, so they overlap the seam instead of meeting it. Parts in front are cut with a margin of body color.
- **Don't exceed what the cut can hide.** Moving a part far reveals the patch painted behind it. Look at a contact sheet of the extreme frames before raising an amplitude.
- **Compact sizes need no special case.** All moves are in canvas units, so they shrink with the mascot.

## Not done, on purpose

- The launch splash (`animated-splash.tsx`) is separate. It must match the native splash image at handoff.
- Identical mascots on one screen (several empty Secret Santa sections) run in sync. It's rare, and offsetting them would cost the story's start.
