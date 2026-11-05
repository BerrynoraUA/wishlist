# Web UI audit: before and after

These are actual screenshots, captured in light mode at a 390px mobile width (23 October 2026 before; 24 October 2026 after). Each comparison places the original UI on the left and the reviewed implementation on the right. Matching top-of-page crops preserve the original screenshots. The connected-apps before image includes the local development error overlay.

| Screen             | What changed                                                                | Evidence                                 |
| ------------------ | --------------------------------------------------------------------------- | ---------------------------------------- |
| Home               | Compact 2×2 mobile statistics reveal the first wishlist earlier.            | [Before and after](01-home.webp)         |
| Login              | Visible password recovery; associated labels and autocomplete.              | [Before and after](02-login.webp)        |
| Friends            | Real avatars and keyboard-accessible card links.                            | [Before and after](03-friends.webp)      |
| Invalid share link | Branded unavailable state with recovery actions.                            | [Before and after](04-share-error.webp)  |
| Shared wishlist    | Correct item count and a brand/action bar.                                  | [Before and after](05-share-valid.webp)  |
| Connected apps     | Missing configuration renders an unavailable state instead of throwing.     | [Before and after](06-connections.webp)  |
| Secret Santa       | Remove repeated participant/budget summary boxes.                           | [Before and after](07-santa.webp)        |
| Subscription       | Separate actual access and management from Monthly/Yearly price comparison. | [Before and after](08-subscription.webp) |

The subscription comparison reflects the final revision: Pro members retain the Monthly/Yearly selector, the price is labeled as a comparison, and the account summary uses “Access through” without assuming renewal. Billing interval and billed amount are explicitly unavailable in the current account data.

- [Updated desktop: Monthly](subscription-monthly-desktop.webp)
- [Updated desktop: Yearly](subscription-yearly-desktop.webp)

Keyboard focus, dialog behavior, accessible names, and mutation-free comparison switching were checked separately; those behaviors cannot be demonstrated by still screenshots.
