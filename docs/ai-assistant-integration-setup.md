# ChatGPT integration — setup guide

Wishlane exposes a remote MCP server at `/api/mcp` that the ChatGPT Apps SDK connects to.
Users sign in through **Supabase Auth's OAuth 2.1 server**; every tool call runs with the
connected user's JWT, so normal table RLS applies. No `service_role` key is involved.

| Piece                                              | Where                                                         |
| -------------------------------------------------- | ------------------------------------------------------------- |
| MCP endpoint (Streamable HTTP, stateless)          | `apps/frontend/src/app/api/mcp/route.ts`                      |
| Protected-resource metadata (RFC 9728)             | `apps/frontend/src/app/.well-known/oauth-protected-resource/` |
| Consent screen (Supabase `authorization_url_path`) | `apps/frontend/src/app/oauth/consent/`                        |
| Manage / disconnect connections                    | `apps/frontend/src/app/oauth/connections/`                    |
| Tools, review cards, widget                        | `apps/frontend/src/mcp/`                                      |
| Audience hook, session check, action ledger        | `supabase/migrations/20261006162258_chatgpt_integration.sql`  |

Do the steps in order.

---

## 1. Apply the migration

```sh
supabase db push
```

This creates:

- `private.mcp_oauth_clients` — operator-managed map of OAuth `client_id` → MCP resource URL.
- `private.mcp_access_token_hook` — sets the JWT `aud` to the MCP resource for that client, so
  tokens issued to ChatGPT are rejected by anything except `/api/mcp`.
- `public.mcp_session_active()` — checked on every MCP request, so disconnecting revokes
  already-issued tokens immediately.
- `public.mcp_actions` — short-lived (10 min) ledger of pending important changes awaiting
  confirmation.
- `mcp_set_gift_status` — atomic gift reservation for assistants.
- `check_star_limit` trigger — enforces the "three starred wishes per wishlist" rule in the
  database for every writer (web, native and assistants), so concurrent writes cannot exceed it.

## 2. Enable the Supabase OAuth server

Dashboard → **Authentication → OAuth Server**:

1. Enable the OAuth server.
2. **Authorization URL path**: `/oauth/consent` (the site URL must be the Wishlane web origin).
3. Leave **dynamic client registration off** — the integration only accepts one pre-registered
   client.

## 3. Register the ChatGPT client

Dashboard → **Authentication → OAuth Apps → Add client**:

- Name: `ChatGPT` (shown on the consent screen).
- Type: confidential.
- Redirect URI: the callback ChatGPT shows when you add the app in its developer settings
  (currently `https://chatgpt.com/connector_platform_oauth_redirect`).
- Scope: `openid`.

Keep the generated **client ID** and **client secret** — the secret goes into ChatGPT (step 6),
the ID goes into Wishlane (step 5) and the database (below).

Register the client's audience (SQL editor):

```sql
insert into private.mcp_oauth_clients (client_id, resource)
values ('<client id>', 'https://<wishlane origin>/api/mcp');
```

## 4. Enable the access token hook

Dashboard → **Authentication → Hooks → Customize Access Token (JWT) Claims**:

- Type: Postgres function
- Function: `private.mcp_access_token_hook`

It only touches tokens for clients listed in `private.mcp_oauth_clients`; app logins are
unchanged.

## 5. Environment variables (Vercel, frontend project)

| Variable                           | Value                                                               |
| ---------------------------------- | ------------------------------------------------------------------- |
| `WISHLANE_MCP_ORIGIN`              | Public HTTPS origin, no trailing slash, e.g. `https://wishlane.app` |
| `WISHLANE_MCP_CLIENT_ID`           | Client ID from step 3                                               |
| `WISHLANE_MCP_CONFIRMATION_SECRET` | Random string, ≥ 32 chars (`openssl rand -base64 48`)               |

If any are missing, `/api/mcp` and the metadata route answer `503` instead of running.

## 6. Add the app in ChatGPT

ChatGPT → **Settings → Apps & Connectors → Advanced → Developer mode**, then **Create**:

- MCP server URL: `https://<wishlane origin>/api/mcp`
- Authentication: OAuth, with the client ID and secret from step 3.

ChatGPT discovers the authorization server from
`/.well-known/oauth-protected-resource`, sends the user to Supabase, which redirects to
`/oauth/consent`. Signed-out users go through the normal login/sign-up flow and come back to
consent (including after email confirmation).

## 7. Verify

```sh
pnpm --filter frontend test:mcp
```

Then in ChatGPT: list wishlists, create a wish from a product link, and delete it — the delete
must show a review card and only run after **Confirm**. Disconnect at
`/oauth/connections` and check the next tool call returns 401.

---

## Scope of the integration

- **Included**: wishlists, wishes (images, product links, priorities, votes), gift
  reservation/bought status, sharing and access, friends, friend groups, blocking,
  notifications, Secret Santa events, invitations and draws.
- **Requires confirmation** in a review card: deletions, sharing/access changes and share
  links, friend requests and responses, removing friends, blocking, saving friend groups,
  reporting wishes, joining/responding to/cancelling Secret Santa invites, removing
  participants, and the Secret Santa draw.
- **Excluded**: billing, passwords, account deletion, raw SQL.
