# Wishlane marketing surfaces: design system

Scope: the landing page (`src/app/(landing)`) and the auth pages (`src/app/login`, `src/app/register`).
The signed-in app keeps its own tokens in `globals.scss`; nothing here overrides them.

## Thesis (validated)

**Visual.** The app's own pieces, shown working: item cards with the priority medallion, the lock
"Reserve" button, the Reserved pill, the five list accent gradients. App magenta is the brand and the
primary action. Cool lilac-white ground, white surfaces, flat with 1px lines, 12-16px radii, pill
buttons, no decorative shadows. Bricolage Grotesque for display, DM Sans for body. Airy, 8px grid.

**Interaction.** Quick and dry. 150 / 250 / 350ms, one ease-out. Press = scale 0.95 spring. One
signature moment: the lock closing on Reserve. Sections enter once (fade + 16px rise). Reduced
motion = opacity only.

**Allowed patterns:** the app's item cards rebuilt as a live demo, the list accent gradients, the
reservation lock animation.

**Forbidden:** blobs, glass, infinite floats, count-up numbers, star ratings, rotating testimonials,
gradient text.

## Dials

| Dial     | Value | From the thesis                                                        |
| -------- | ----- | ---------------------------------------------------------------------- |
| Variance | 5     | "flat surfaces, thin borders, pill buttons" + one playful display face |
| Motion   | 4     | "quick and dry, one ease-out, single lock moment, once-only reveals"   |
| Density  | 3     | "airy, 8px grid"                                                       |

The dataset query (`ui-ux-pro-max`, same dials) proposed rose `#E11D48` + blue CTA, Fredoka/Nunito,
an App Store pattern with star ratings and a `back.out` stagger. All rejected: they contradict the
validated palette, type, and the "no star ratings" line.

## Tokens (`src/styles/_marketing.scss`, mixin `marketing-tokens`)

| Token                       | Light                     | Dark                      | Contrast                                 |
| --------------------------- | ------------------------- | ------------------------- | ---------------------------------------- |
| `--wl-ground`               | `#F6F5FA`                 | `#141016`                 |                                          |
| `--wl-surface`              | `#FFFFFF`                 | `#1E1822`                 |                                          |
| `--wl-ink`                  | `#1B1420`                 | `#F3EEF5`                 | 16.6 / 16.5 on ground                    |
| `--wl-muted`                | `#5E5566`                 | `#A79DAE`                 | 6.5 on ground / 6.7 on surface           |
| `--wl-line`                 | `#E4E0E8`                 | `#2E2633`                 | decorative                               |
| `--wl-edge`                 | `#8C8394`                 | `#857C8D`                 | 3.6 / 4.4 (input borders, >= 3)          |
| `--wl-brand`                | `#C0267E`                 | `#E052A0`                 | app magenta                              |
| `--wl-brand-strong`         | `#9B1F66`                 | `#F07BBE`                 | hover                                    |
| `--wl-brand-fill`           | `#C0267E`                 | `#CC2F88`                 | button fill; hover `#9B1F66` / `#C0267E` |
| `--wl-on-brand`             | `#FFFFFF`                 | `#FFFFFF`                 | 5.5 / 4.85 on the fill                   |
| `--wl-reserved-bg/line/ink` | `#FDE7F3 #F9A8D4 #BE185D` | `#3D1327 #7A284F #F9A8D4` | native item-labels                       |

List accents: the app's `--accent-pink|blue|peach|mint|lavender` (theme-aware, from `globals.scss`).
Priority colours: from `packages/backend/lib/priorities.ts` (High `#ef4444`, Starred = brand).

## Type

- Display: Bricolage Grotesque (`--font-display`, next/font), 700-800, tracking -0.03em at large sizes.
- Body: DM Sans (`--font-sans`, already the app face), 16-18px, line-height 1.55.

## Motion

| Name                 | Value                                                 | Source                                    |
| -------------------- | ----------------------------------------------------- | ----------------------------------------- |
| fast / normal / slow | 150 / 250 / 350ms                                     | native `lib/motion.ts`, web `$duration-*` |
| ease                 | `cubic-bezier(0.16, 1, 0.3, 1)`                       | web `$ease-out`                           |
| press                | `whileTap scale 0.95`, spring 460 / 16 / 0.75         | native `AnimatedPressable`                |
| toggle pill          | `layoutId`, spring 500 / 24 / 1                       | native `SlidingOptionSelector`            |
| lock                 | 420ms `cubic-bezier(0.22, 1, 0.36, 1)`                | web `ReservationLockIcon` (reused)        |
| section entry        | opacity 0 -> 1, y 16 -> 0, 250ms, once, 60ms stagger  | native `FadeInDown`                       |
| reduced motion       | `MotionConfig reducedMotion="user"` + CSS media query | native `useReducedMotion`                 |
