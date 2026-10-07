# ChatGPT and Claude integration — setup guide

Wishlane exposes a remote MCP server at `/api/mcp` that ChatGPT (Apps SDK) and Claude (custom
connectors) connect to. Users sign in through **Supabase Auth's OAuth 2.1 server**; every tool
call runs with the connected user's JWT, so normal table RLS applies. No `service_role` key is
involved.

| Piece                                            | Where                                                         |
| ------------------------------------------------ | ------------------------------------------------------------- |
| MCP endpoint (Streamable HTTP, stateless)        | `apps/frontend/src/app/api/mcp/route.ts`                      |
| Protected-resource metadata (RFC 9728)           | `apps/frontend/src/app/.well-known/oauth-protected-resource/` |
| Consent screen (Supabase authorization path)     | `apps/frontend/src/app/oauth/consent/`                        |
| Manage / disconnect connections                  | `apps/frontend/src/app/oauth/connections/`                    |
| Tools, review cards, widget                      | `apps/frontend/src/mcp/`                                      |
| Audience hook, session check, action ledger      | `supabase/migrations/20261006162258_chatgpt_integration.sql`  |
| Supported assistants (client ID env var, origin) | `apps/frontend/src/mcp/config.ts`                             |

Each assistant is a **pre-registered OAuth client**. Tokens from any other client are rejected,
so in both assistants you must enter Wishlane's client ID rather than letting them register
themselves.

## 0. What you need

Both assistants run in the cloud, so they must reach Wishlane and Supabase over public HTTPS.
A local `supabase start` stack or `localhost` won't work.

- **A hosted Supabase project** (staging, a branch, or production) with this migration applied.
- **A public HTTPS deployment of this code**, e.g. a Vercel preview of the branch. Turn off
  Vercel Deployment Protection for it (or use production), or the assistants get the Vercel
  login page instead of the MCP server.
- **The project's Site URL must be that deployment.** Supabase sends users to Site URL +
  authorization path (`/oauth/consent`), so that page must run this code. If the deployment URL
  isn't the Site URL, also add it under **Authentication → URL Configuration → Redirect URLs** so
  login and sign-up return there.

Below, `<origin>` is that deployment's origin with no trailing slash, e.g.
`https://wishlist-git-feat-chatgpt-integration-acme.vercel.app`.

Do the steps in order.

---

## 1. Apply the migration

```sh
supabase db push
```

This creates:

- `private.mcp_oauth_clients` — operator-managed map of OAuth `client_id` → MCP resource URL.
- `private.mcp_access_token_hook` — sets the JWT `aud` to the MCP resource for those clients,
  so tokens issued to an assistant are rejected by anything except `/api/mcp`.
- `public.mcp_session_active()` — checked on every MCP request, so disconnecting revokes
  already-issued tokens immediately.
- `public.mcp_actions` — short-lived (10 min) ledger of pending important changes awaiting
  confirmation.
- `mcp_set_gift_status` — atomic gift reservation for assistants.
- `check_star_limit` trigger — enforces the "three starred items per wishlist" rule in the
  database for every writer (web, native and assistants), so concurrent writes cannot exceed it.

## 2. Enable the Supabase OAuth server

Dashboard → **Authentication → OAuth Server**:

1. Enable the OAuth server.
2. **Authorization Path**: `/oauth/consent`.
3. Leave **dynamic client registration off**. Only the pre-registered clients below are
   accepted.

## 3. Register the OAuth clients in Supabase

Dashboard → **Authentication → OAuth Apps → Add a new client**, once per assistant. Use
**confidential** clients and keep each **client ID** and **client secret**.

| Name (shown on consent) | Redirect URIs                                           |
| ----------------------- | ------------------------------------------------------- |
| `ChatGPT`               | `https://chatgpt.com/connector_platform_oauth_redirect` |
| `Claude`                | `https://claude.ai/api/mcp/auth_callback`               |

ChatGPT may show a different, app-specific callback (`https://chatgpt.com/connector/oauth/<id>`)
once you connect in step 6; if so, add it to the ChatGPT client's redirect URIs then.

Then map both clients to the MCP resource (SQL editor). `resource` must be exactly
`<origin>/api/mcp`:

```sql
insert into private.mcp_oauth_clients (client_id, resource) values
  ('<chatgpt client id>', '<origin>/api/mcp'),
  ('<claude client id>',  '<origin>/api/mcp');
```

You can set up only one assistant; skip the other's client, row and env var.

## 4. Enable the access token hook

Dashboard → **Authentication → Hooks → Customize Access Token (JWT) Claims**:

- Type: Postgres function
- Function: `private.mcp_access_token_hook`

It only changes tokens for clients listed in `private.mcp_oauth_clients`; app logins are
unchanged.

## 5. Environment variables (frontend deployment)

| Variable                           | Value                                                 |
| ---------------------------------- | ----------------------------------------------------- |
| `WISHLANE_MCP_ORIGIN`              | `<origin>`: HTTPS, no trailing slash                  |
| `WISHLANE_MCP_CHATGPT_CLIENT_ID`   | ChatGPT client ID from step 3                         |
| `WISHLANE_MCP_CLAUDE_CLIENT_ID`    | Claude client ID from step 3                          |
| `WISHLANE_MCP_CONFIRMATION_SECRET` | Random string, ≥ 32 chars (`openssl rand -base64 48`) |

At least one client ID is required. `NEXT_PUBLIC_SUPABASE_URL` must point at the project from
step 2. Redeploy after setting them. If anything is missing, `/api/mcp` and the metadata route
answer `503`.

Check the deployment before connecting. The assistants discover the sign-in setup from these
same URLs, so ChatGPT's OAuth settings stay greyed out until they work:

```sh
curl -s <origin>/.well-known/oauth-protected-resource/api/mcp   # JSON with "resource": "<origin>/api/mcp"
curl -si -X POST <origin>/api/mcp | head -1                      # HTTP/... 401
```

## 6. Connect the assistants

**ChatGPT** needs developer mode on a paid plan (Plus, Pro, Business, Enterprise or Edu), on the
web. If **Settings → Security and login** shows a **Developer mode** toggle, turn it on; if it
doesn't, it's already on. Turning on **Enforce CSP for custom apps** there makes testing match
production.

1. Open [chatgpt.com/plugins](https://chatgpt.com/plugins) (not the **Settings → Plugins** list),
   click **Add**, then **Create custom MCP server**.
2. Name `Wishlane`, **Connection → Server URL** `<origin>/api/mcp`, **Authentication** OAuth.
3. Open **Advanced OAuth settings** (enabled once ChatGPT has read the URL). Choose the manual /
   user-defined client setup, enter the ChatGPT client ID and secret, keep the scope `openid`,
   and check the callback URL shown against the ChatGPT client's redirect URIs in Supabase.
4. Tick **I understand and want to continue**, then **Create as a plugin**. In a chat, enable
   Wishlane from the **+** menu and connect when asked.

**Claude** (claude.ai web, desktop or mobile): **Customize → Connectors → Add custom connector**
(Team/Enterprise: an Owner adds it in **Organization settings → Connectors**):

- Name: `Wishlane`
- MCP server URL: `<origin>/api/mcp`
- Under **Advanced settings** (or **OAuth client → Use your own OAuth client**): the Claude
  client ID and secret.

Claude Code can't connect directly: it registers its own client with a loopback redirect, which
this integration doesn't accept. Use a connector added in claude.ai instead.

Both flows go to Supabase, then to `<origin>/oauth/consent`. Signed-out users log in or sign up
first and return to consent afterwards.

## 7. Verify

```sh
pnpm --filter frontend test:mcp
```

Then in each assistant:

1. "Show my wishlists": the Wishlane card lists them; open one.
2. Reserve an item from the card, then mark it purchased; the owner gets a notification.
3. "Add this to my <list>: <product link>": the item appears with its details.
4. "Delete that item": a review card appears, nothing changes until you click **Confirm**, and
   **Cancel** leaves it in place.
5. Secret Santa: create an event inviting a friend (confirm), accept as the friend, launch
   (confirm). Invitees and participants get notifications; each sees only their own receiver.
6. Disconnect at `<origin>/oauth/connections`; the next tool call fails with 401 and the
   assistant asks to reconnect.

In Claude, also check that `confirm_action` isn't offered to the model (ask it to list its
Wishlane tools).

### Product wish prompting

The server instructions and tool descriptions guide the assistant to offer shop search
before creating a wish without a product link. The assistant uses its host's web search and
browsing tools, when available, to read the shop listing itself and pass verified title,
description, direct image URL, price, currency and discount details to `create_wish`. It
preserves the user's notes and leaves unknown fields empty, without guessing image URLs.
Wishlane's `inspect_product_link` is a fallback for unavailable or unsuccessful browsing,
or an explicit request to use Wishlane import. Successful browsing should not trigger a
duplicate importer call. If optional fields are missing, offer import or manual entry.
Users can explicitly choose manual entry.
This is model guidance, not a server-enforced prerequisite for `create_wish`.

After deploying, check the following in a fresh conversation with the updated tool metadata:

- "Add a coffee grinder to my wishlist": the assistant first offers to find a shop listing.
  Agree to search, choose a listing if needed, and check that it reads the shop listing with
  host browsing and calls `create_wish` with available details, without `inspect_product_link`.
- "Add this to my wishlist: <product link>": it reads that link with host browsing, without
  asking to search again, and resolves the target wishlist if unclear.
- "Add a manual wish called weekend away, no shop search": it respects manual entry.
- With browsing unavailable or blocked, it can use `inspect_product_link` as a fallback.
  If that also fails, it offers another link or manual entry. For a listing without a price
  or direct image URL, it leaves those fields empty and offers help filling the gaps.

---

## Scope of the integration

- **Included**: wishlists, items (images, product links, priorities, votes), gift
  reservation/purchased status, sharing and access, friends, friend groups, blocking,
  notifications, Secret Santa events, invitations and launches.
- **Requires confirmation** in a review card: deletions, sharing/access changes and share
  links, friend requests and responses, removing friends, blocking, saving friend groups,
  reporting items, joining/responding to/cancelling Secret Santa invites, removing
  participants, and launching Secret Santa.
- **Excluded**: billing, passwords, account deletion, raw SQL.
