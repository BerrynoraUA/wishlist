# Splash startup benchmark — 2026-10-04

Pixel 10 Pro XL Android emulator, existing development build and cached signed-in account. Measured six process relaunches per version in before/after/before/after batches of three. One warm-up per batch was excluded (four total). Same Metro instance on port 8082; no app data was cleared.

`entryToReady` measures performance.now() from the start of the custom JavaScript entry point until the splash reveal effect starts. `entryToDone` ends in the effect after overlay removal commits. It is not a frame-presentation measurement and excludes native process startup, dev-client loading, and bundle transfer before JavaScript entry. `reveal` is the difference between those markers, including scheduling delays and competing work.

| Metric                          |         Before |          After |
| ------------------------------- | -------------: | -------------: |
| Median entry to reveal          |       3,702 ms |       3,409 ms |
| Median entry to overlay removal |       5,647 ms |       5,519 ms |
| Overlay removal range           | 5,061–7,043 ms | 4,656–6,372 ms |

Observed median improvement: 128 ms (2.3%). The distributions overlap substantially; this small development-emulator sample does not establish a reliable overall speedup. Pre-reveal median improved by 293 ms (7.9%), but that did not translate into an equivalent overall improvement. The iOS native-splash dismissal fix was not measurable on this Android host.

Raw measurements, including explicitly marked warm-ups, are in results.jsonl. Timing instrumentation was temporary and removed afterward. The optimized source was restored; pnpm ref and pnpm check-types passed.
