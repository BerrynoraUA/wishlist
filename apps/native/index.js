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
import "./polyfills/gtIntlPolyfills";

import "expo-router/entry";
