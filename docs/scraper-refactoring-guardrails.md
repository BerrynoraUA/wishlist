# Scraper Refactoring Guardrails

This document defines behavior that must remain unchanged during scraper refactoring. Refactoring
may simplify structure, remove proven duplication, and improve naming, but it must not silently
change scraping results, routing, diagnostics, or fallback behavior.

## Pipeline invariants

1. Internal API adapters run before HTML scraping when an adapter supports the URL.
2. Known domains start with the preferred method from the domain strategy table.
3. A blocked, failed, or incomplete preferred result continues through the fallback pipeline.
4. Unknown domains use the complete fallback pipeline.
5. Supported methods remain Next legacy, `scrapling_http`, `scrapling_browser`, and `jina_reader`.
6. An accepted result wins. Otherwise, the result with the higher quality score wins.
7. Diagnostics retain attempted methods, selection state, timing, warnings, and parser sources.

## Extraction contracts

- Preserve the `ProductData`, quality, diagnostics, parser-source, and attempt-history contracts.
- Store-specific extraction has priority. Generic extraction may fill only missing fields.
- Preserve `do_not_merge:*` field protection and placeholder/non-product-page detection.
- Preserve URL canonicalization, product identifiers, selected variants, SKU scoping, and
  SKU-bound price context.
- Do not replace domain-, product-, or SKU-scoped extraction with a broad price regex.
- Price, discount, currency, image, and title must continue to describe the requested product and
  selected variant, not a recommendation, advertisement, or unrelated offer.

## Safe refactoring rules

- Moving code, splitting large modules, renaming private symbols, and consolidating equivalent
  helpers are allowed when observable behavior remains identical.
- Do not unintentionally change routing order, fallback triggers, quality thresholds, timeouts,
  result-selection rules, merge precedence, or diagnostics.
- Keep orchestration, fetching, normalization, store extraction, generic extraction, and quality
  evaluation as explicit responsibilities. Avoid moving domain-specific conditions into shared
  orchestration.
- Delete a fallback, parser, or test only after proving it is unreachable or redundant and adding
  equivalent coverage where required.
- Prefer deleting accidental complexity over adding wrappers, flags, or scattered special cases.

## Mandatory verification

Before considering a scraper refactor complete:

1. Run the complete Python test suite.
2. Run `pnpm ref`.
3. Run `pnpm check-types`.
4. Compare representative endpoint products and diagnostics before and after the refactor.
5. Compare aggregate `success`, `partial`, and `blocked` counts; investigate every regression.
6. Confirm known-domain preference and unknown-domain fallback behavior.
7. Confirm attempt history and selected parser sources still explain the returned result.

If behavior cannot be shown to be equivalent, treat the change as a functional change rather than
cleanup and review it separately.
