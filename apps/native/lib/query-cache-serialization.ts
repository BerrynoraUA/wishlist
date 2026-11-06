/**
 * JSON for the persisted query cache, extended for the one non-JSON shape the cache holds:
 * `Set`s, which `getItemVotes` returns for the user's votes. Plain JSON would turn them into
 * `{}` and break `userVotes.has()` after a restore.
 */

const SET_TAG = "__querySet";

type TaggedSet = { [SET_TAG]: unknown[] };

function isTaggedSet(value: unknown): value is TaggedSet {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as Partial<TaggedSet>)[SET_TAG])
  );
}

export function serializeQueryCache(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry instanceof Set) return { [SET_TAG]: [...entry] };
    if (entry instanceof Error) return { name: entry.name, message: entry.message };
    // A process can die after sending but before receiving the reply. Hydration only
    // resumes paused mutations, so saved in-flight writes must also resume as paused.
    if (
      entry &&
      typeof entry === "object" &&
      "isPaused" in entry &&
      "status" in entry &&
      entry.status === "pending"
    ) {
      return { ...entry, isPaused: true };
    }
    return entry;
  });
}

export function deserializeQueryCache<T>(raw: string): T {
  return JSON.parse(raw, (_key, entry: unknown) =>
    isTaggedSet(entry) ? new Set(entry[SET_TAG]) : entry,
  ) as T;
}
