import { randomInt } from "node:crypto";

// Bipartite matching finds a draw whenever the exclusions permit one.
export function generateAssignment(
  participants: string[],
  excluded: Map<string, Set<string>>,
  random = (max: number) => randomInt(max),
) {
  function shuffled(values: string[]) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  const receivers = new Map<string, string>();
  function assign(giver: string, seen: Set<string>): boolean {
    for (const receiver of shuffled(participants)) {
      if (receiver === giver || excluded.get(giver)?.has(receiver) || seen.has(receiver)) continue;
      seen.add(receiver);
      const previous = receivers.get(receiver);
      if (!previous || assign(previous, seen)) {
        receivers.set(receiver, giver);
        return true;
      }
    }
    return false;
  }
  for (const giver of shuffled(participants)) if (!assign(giver, new Set())) return null;
  return [...receivers].map(([receiver_id, user_id]) => ({ user_id, receiver_id }));
}
