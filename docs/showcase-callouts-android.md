# Showcase callout clouds — Android

Every speech cloud drawn onto the framed marketing screenshots for the Google Play
phone slot (`google-play/phone`, **1080×1920**): the words it carries, the element on
screen it attaches to, and the numbers that put it there.

Source of truth is [`frames.scenes`](../scripts/showcase/showcase.config.ts) — this file
is a readable projection of it. Change the config, not this table.

Output: `apps/native/artifacts/framed/google-play/phone/{light,dark}/NN-scene.png`

## How a placement is defined

| Field                   | Meaning                                                                                                                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `anchor.x` / `anchor.y` | Where the pink dot lands, as a **fraction of the phone screen** (the captured image inside the frame), not of the whole canvas. `0,0` is the screen's top-left, `1,1` its bottom-right. |
| `side`                  | Which **canvas** edge the cloud is pinned to — `left` or `right`. Independent of the anchor: a cloud on the left can point at a dot on the right, and some do.                          |
| `lift`                  | Vertical nudge of the cloud's centre away from the dot, as a fraction of screen height. Negative lifts the cloud **up**, positive pushes it **down**.                                   |

The tail is three shrinking bubbles at 30 %, 56 % and 80 % along the line from the
cloud's inner face to the dot. The cloud is clamped to stay fully on canvas, so an
extreme `lift` is silently capped rather than bleeding off the edge.

For the 1080×1920 slot the phone screen sits at **x 105…975, y 304…1850**
(870×1546), so canvas pixels = `105 + x·870` and `304 + y·1546`. The last column below
is the same dot in **raw capture** pixels — `x·1080`, `y·1920` — which is what to
compare against a screenshot opened in an image viewer.

## The clouds

Copy is written against what the fixture data actually renders, so the numbers in a
line ("Three already claimed", "Six people") are the numbers on screen. Change the
fixtures in [`showcase/data.ts`](../packages/backend/supabase/showcase/data.ts) and the
copy has to move with them.

| Scene                |  #  | Cloud text                                               | Points at                               | Side  | Anchor (x, y) |  Lift   | Dot on canvas | Dot in capture |
| -------------------- | :-: | -------------------------------------------------------- | --------------------------------------- | :---: | :-----------: | :-----: | :-----------: | :------------: |
| `wishlists`          |  1  | Taken items show up — / no double gifts                  | the **3 Reserved** stat card            | left  | 0.300, 0.352  | +0.140  |   366, 848    |    324, 676    |
| `wishlists`          |  2  | You choose who / gets to see it                          | **Friends only** on the Birthday card   | right | 0.675, 0.702  | −0.086  |   692, 1389   |   729, 1348    |
| `item-link`          |  1  | Drop a link — / that's it                                | the pasted **URL field**                | right | 0.720, 0.338  | −0.160  |   731, 827    |    778, 649    |
| `item-link`          |  2  | Photo and price, / pulled in for you                     | the auto-filled **279.00** price        | left  | 0.300, 0.866  | −0.125  |   366, 1643   |   324, 1663    |
| `discover`           |  1  | Never miss a date — / we remind you in time              | **Jamie Chen's Birthday in 9 days**     | left  | 0.720, 0.2405 | −0.094  |   731, 676    |    778, 462    |
| `discover`           |  2  | Mark the gift you're giving — / no one else will take it | the greyed **RESERVED** Kindle          | right | 0.880, 0.660  | +0.152  |   871, 1324   |   950, 1267    |
| `secret-santa`       |  1  | Date, budget, people — / it runs itself                  | the **GBP 50** budget                   | left  | 0.235, 0.431  | +0.100  |   309, 970    |    254, 828    |
| `secret-santa`       |  2  | Same budget / for everyone                               | **6 participants** on Studio gift swap  | right | 0.632, 0.738  | −0.152  |   655, 1445   |   683, 1417    |
| `secret-santa-event` |  1  | Your match. / Just for your eyes                         | the drawn match, **Jamie Chen**         | right | 0.620, 0.323  | −0.115  |   644, 803    |    670, 620    |
| `wishlist`           |  1  | Mark what you / want most                                | the **High** priority badge             | right | 0.775, 0.453  | −0.090  |   779, 1004   |    837, 870    |
| `wishlist`           |  2  | Only you decide / who can see it                         | the **Friends only** / date chips       | left  | 0.253, 0.2563 | +0.2317 |   325, 700    |    273, 492    |
| `friends`            |  1  | Lists stay closed / until you confirm                    | the **Requests 1** tab badge            | right | 0.850, 0.1083 | +0.1337 |   845, 471    |    918, 208    |
| `friends`            |  2  | See what your friends / actually want                    | **3 wishlists · 4 mutual** (Sam Carter) | right | 0.520, 0.604  | −0.105  |   557, 1238   |   562, 1160    |

`/` marks the configured line break inside a cloud. Line breaks are hand-set, not
wrapped — the cloud is sized to its longest line, so keep a line under about 25
characters or the cloud starts crowding the frame.

## Headlines

Drawn above the phone, two lines, with a highlighter swash under the last one.

| Scene                | Headline                            |
| -------------------- | ----------------------------------- |
| `wishlists`          | Never lose a / gift idea again      |
| `item-link`          | Paste a link. / It fills itself in. |
| `discover`           | Know exactly / what to buy them     |
| `secret-santa`       | Secret Santa that / runs itself     |
| `secret-santa-event` | Names drawn. / Nobody knows.        |
| `wishlist`           | Get the exact / one you wanted      |
| `friends`            | Never guess a / present again       |

## Notes on the odd ones

- **`wishlists` #1** points at the owner's own **Reserved** counter. That stat is items
  on _your_ lists that friends have claimed — not gifts you claimed for someone else.
  The owner sees the _count_, but by default never _which_ items: `show_own_reservations`
  is off and Pro-gated on read. Note the tension with `discover` #2, which tells the
  buyer the recipient will never know — same fact, two screens, two readings.
- **`discover` #1** hangs left while pointing at `x 0.720`, and both **`friends`** clouds
  hang right. Deliberate: those rows put their avatar and name hard against the left
  edge, so a cloud on the near side could only land on top of a name.
- **`secret-santa-event`** carries a single cloud. The screen is already a stack of
  cards — match, gift suggestions, participants — and match secrecy is the one claim
  worth making there. The gift-suggestions card is the obvious candidate if a second
  cloud is ever wanted.
- **These anchors are Android-only.** Fractions survive a change of upload size, but
  they were tuned against this 9:16 capture. The iPhone slots are 9:19.5, where the app
  lays out with more vertical room, and will need an anchor pass of their own.

## Re-tuning

Edit `frames.scenes` in [`showcase.config.ts`](../scripts/showcase/showcase.config.ts),
then re-render from captures already on disk — no emulator, no rebuild:

    pnpm screenshots:frames --device pixel --appearance light
