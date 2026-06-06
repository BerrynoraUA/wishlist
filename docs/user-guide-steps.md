# User Guide Steps

## Assumptions

- This guide is for the web app onboarding after a user signs in or creates an account.
- The guide should be interactive: each step points to a real screen element, explains one action, and can move forward, back, skip, or resume later.
- The guide should persist progress per signed-in user.
- Optional flows, such as shared links, Secret Santa, settings, and subscription, should be triggered contextually instead of blocking the core onboarding.

## Core Onboarding Flow

| Step | Page             | Step name       | What should be on screen                                                        | Description                                                                         |
| ---- | ---------------- | --------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1    | `/home`          | Main menu       | TopNav with My Wishlists, Friends, Discover, and Secret Santa visible.          | Ask the user to hover each main nav item in order.                                  |
| 2    | `/home`          | Start wishlist  | `Add Wishlist` button visible in the dashboard header.                          | Ask the user to click `Add Wishlist` to start creating their first wishlist.        |
| 3    | `/home`          | Create wishlist | `Create Wishlist` button visible in the modal footer.                           | Ask the user to create the wishlist and return to the home grid.                    |
| 4    | `/home`          | Open details    | Wishlist grid visible with the newly created wishlist card.                     | Ask the user to click the wishlist card to open its detail page.                    |
| 5    | `/wishlist/[id]` | Add item        | `Add Item` button visible in the wishlist header.                               | Ask the user to click `Add Item` to add a gift idea.                                |
| 6    | `/wishlist/[id]` | Create item     | `Create Item` button visible in the modal footer.                               | Ask the user to create the item and return to the wishlist item grid.               |
| 7    | `/wishlist/[id]` | Share           | Share button visible in the wishlist header.                                    | Explain that sharing creates a link friends can open to view and reserve items.     |
| 8    | `/wishlist/[id]` | Manage access   | Manage access button visible in the wishlist header for owners.                 | Explain that owners can grant or revoke access for specific friends and groups.     |
| 9    | `/wishlist/[id]` | Edit wishlist   | More options menu open in the wishlist header with the `Edit` action visible.   | Explain that the owner can open the edit modal to update wishlist details.          |
| 10   | `/wishlist/[id]` | Delete wishlist | More options menu open in the wishlist header with the `Delete` action visible. | Explain that deleting opens a confirmation modal before anything is removed.        |
| 11   | `/home`          | Open card       | Wishlist grid visible with at least one wishlist card.                          | Explain that clicking a wishlist card opens its detail page.                        |
| 12   | `/home`          | Open Friends    | Top navigation visible with the Friends tab.                                    | Ask the user to click Friends in the top navigation.                                |
| 13   | `/friends`       | Add friend      | Friends header invite/add action visible.                                       | Ask the user to open the add friend modal.                                          |
| 14   | `/friends`       | Requests        | `Requests` tab visible.                                                         | Explain that incoming requests can be accepted or rejected.                         |
| 15   | `/friends`       | Sent            | `Sent` tab visible.                                                             | Explain that outgoing requests can be tracked or canceled.                          |
| 16   | `/friends`       | Groups          | `Groups` tab and `Create group` action visible.                                 | Explain that groups make it easier to share wishlists with several friends at once. |
| 17   | `/friends`       | Create group    | `Groups` tab visible with `Create group` action.                                | Ask the user to open the create group modal.                                        |
| 18   | `/friends`       | Open Discover   | Top navigation visible with the Discover tab.                                   | Ask the user to click Discover in the top navigation.                               |
| 19   | `/discover`      | Discover tabs   | Tabs visible: All Wishlists, Available, Reserved, Purchased.                    | Ask the user to hover each Discover tab in order.                                   |
| 20   | `/discover`      | Reserve gift    | Available friend item card visible with reserve action.                         | Ask the user to reserve an item so others know it is being handled.                 |

## Optional Contextual Flows

| Step | Page                 | Step name                 | What should be on screen                                                                    | Description                                                                                                 |
| ---- | -------------------- | ------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 21   | `/share`             | Open shared wishlist      | Shared wishlist page with shared header and item grid visible.                              | Explain that this is the recipient/friend view opened from a share link.                                    |
| 22   | `/share`             | Reserve from shared link  | Shared item card with reserve action visible.                                               | Explain that reserving may require signing in so the reservation can be connected to a person.              |
| 23   | `/share`             | Sign in to reserve        | Auth prompt modal visible.                                                                  | Explain why authentication is needed and continue back to the same shared wishlist after auth.              |
| 24   | `/share`             | Friend request status     | Friend request status modal visible after shared-link interaction.                          | Explain whether the user is already connected, request was sent, or another action is needed.               |
| 25   | `/secret-santa`      | Secret Santa overview     | Secret Santa page with `New Event` button and events grid visible.                          | Explain that Secret Santa is for organizing gift exchanges with friends.                                    |
| 26   | `/secret-santa`      | Create Secret Santa event | Create Secret Santa modal visible.                                                          | Guide the user through event name, date, budget, currency, and participants/invites.                        |
| 27   | `/secret-santa/[id]` | Event detail              | Secret Santa detail page with hero, participants, pending invites, and invite link visible. | Explain where the event owner manages participants and shares the invite.                                   |
| 28   | `/secret-santa/[id]` | Launch exchange           | Launch card/modal visible when enough participants are ready.                               | Explain that launching assigns receivers and may lock some event setup actions.                             |
| 29   | `/secret-santa/[id]` | Your receiver             | Started event view with receiver card visible.                                              | Explain that each participant sees their assigned receiver and can use wishlist suggestions for gift ideas. |
| 30   | `/secret-santa/join` | Join event                | Join status screen visible.                                                                 | Explain that the user is accepting an invite and will be redirected when the join action finishes.          |
| 31   | `/settings`          | Settings overview         | Settings page with Profile, Account, Notifications, and Appearance tabs visible.            | Explain that settings control profile information, account options, notifications, and visual preferences.  |
| 32   | `/settings`          | Profile settings          | Profile tab visible.                                                                        | Explain how the user's display profile affects friends, invites, and shared wishlist identity.              |
| 33   | `/settings`          | Notification settings     | Notifications tab visible.                                                                  | Explain how to choose which friendship, reservation, discount, and event updates should notify the user.    |
| 34   | `/settings`          | Appearance settings       | Appearance tab visible.                                                                     | Explain theme, accent, and default visual preferences.                                                      |
| 35   | `/subscription`      | Upgrade context           | Subscription page visible after a free-limit action redirects here.                         | Explain which limit was reached and what Pro unlocks in that exact context.                                 |
| 36   | `/ideas`             | Share feedback            | Ideas page visible.                                                                         | Explain that users can submit product ideas or feedback from this page.                                     |

## Progress Bar Requirements

| Requirement     | Description                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Placement       | Show the progress bar inside the guide card/modal header, above the step title.                             |
| Label           | Show compact text like `Step 6 of 20` for core onboarding and `Optional step 2 of 16` for contextual flows. |
| Shape           | Use a horizontal 4-6px progress track with full pill radius.                                                |
| Fill            | Use the active brand/accent color from the current theme.                                                   |
| Track           | Use a muted surface or border token with enough contrast in light and dark mode.                            |
| Desktop variant | Allow segmented labels for major sections: Home, Wishlist, Friends, Discover, Finish.                       |
| Mobile variant  | Use only the compact numeric label and a single progress line.                                              |
| Animation       | Animate fill changes in 150-250ms using transform or width. Respect reduced motion.                         |
| Navigation      | Provide Back, Next, Skip, Finish, and Resume guide behavior.                                                |
| Persistence     | Store current step, skipped state, and completed state per user.                                            |
| Accessibility   | Announce progress text to screen readers and keep all controls keyboard accessible.                         |
