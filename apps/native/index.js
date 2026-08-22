// Custom entry point, ahead of `expo-router/entry`.
//
// `generaltranslation` copies the Intl constructors into a private table the first time
// its module body evaluates, and every later call builds from that snapshot rather than
// from the live `Intl`. Expo Router pulls route files in through `require.context`, so a
// screen importing `useGT` can evaluate the library before `app/_layout.tsx` runs — which
// would freeze Hermes' own incomplete implementations in place for the whole session and
// make GT reject every configured locale at startup.
//
// Installing the polyfills here guarantees they are in place before any route module is
// touched. This is the only reason the file exists; see `polyfills/gtIntlPolyfills.ts`.
//
// `require` rather than `import` throughout: import declarations all evaluate before any
// statement in the module body, so the session warm-up below would end up running after
// the whole route tree had already been pulled in. Here execution order is the point.

require("./polyfills/gtIntlPolyfills");

// Start restoring the session now rather than waiting for `AuthProvider`'s effect, which
// only runs once the whole provider chain has rendered. The keychain read — and any token
// refresh it triggers — then overlaps evaluating the rest of the bundle instead of
// following it, which matters because `AuthGate` blocks the route tree until it resolves.
//
// This does not replace `onAuthStateChange` in the provider: supabase-js dedupes against
// its internal `_initialize()` promise and the configured `processLock`, so
// `INITIAL_SESSION` still fires there as usual. This only starts the clock earlier.
const { supabase } = require("@wishlist/backend/supabase/native");

void supabase.auth.getSession().catch(() => {});

require("expo-router/entry");
