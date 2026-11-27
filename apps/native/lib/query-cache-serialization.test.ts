import { describe, expect, it } from "vitest";
import { deserializeQueryCache, serializeQueryCache } from "./query-cache-serialization";

describe("query cache serialization", () => {
  it("restores Sets nested in query data", () => {
    const votes = { counts: { a: 2 }, userVotes: new Set(["a", "b"]) };

    const restored = deserializeQueryCache<{ data: typeof votes }>(
      serializeQueryCache({ data: votes }),
    );

    expect(restored).toEqual({ data: votes });
    expect(restored.data.userVotes.has("a")).toBe(true);
  });

  it("round-trips plain JSON unchanged", () => {
    const value = { pages: [[{ id: "1", tags: [], reserved_by: null }]], pageParams: [0] };

    expect(deserializeQueryCache(serializeQueryCache(value))).toEqual(value);
  });
});
