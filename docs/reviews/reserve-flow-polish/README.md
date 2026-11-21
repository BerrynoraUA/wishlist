# Reserve flow polish: before and after

Actual screenshots from the Android emulator (Pixel 10 Pro XL, dark theme, staging data), captured on 6 November 2026. Each image shows the original UI on the left and the fixed UI on the right.

| Issue                    | What changed                                                                                      | Evidence                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Generic title            | The screen is titled with the friend's name instead of "Friend's Wishlists".                      | [Before and after](friend-title.webp)           |
| Status bar               | Content no longer scrolls under the transparent status bar, so the icons stay readable.           | [Before and after](status-bar.webp)             |
| Back button over a title | The button slides away while scrolling down and returns on a scroll up.                           | [Before and after](back-button-over-title.webp) |
| Card jumps after Reserve | The card stays in place and its ribbon plays on screen. The list re-sorts the next time it loads. | [Before and after](reserve-stays.webp)          |
| Back button over Release | The last card clears the button at the end of the list.                                           | [Before and after](end-of-list.webp)            |

The reserved ribbon also changes from lavender to the pink of the Reserve button. This shows in the "Card jumps" image.
