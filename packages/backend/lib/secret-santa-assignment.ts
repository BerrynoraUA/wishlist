function shuffle<T>(values: readonly T[], random: () => number) {
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function generateSecretSantaAssignment(
  participantIds: string[],
  exclusions: Map<string, Set<string>>,
  random: () => number = Math.random,
): Map<string, string> | null {
  const receiverToGiver = new Map<string, string>();
  const giverToReceiver = new Map<string, string>();
  const orderedGivers = shuffle(participantIds, random);

  function tryAssign(giver: string, seenReceivers: Set<string>): boolean {
    const candidates = shuffle(
      participantIds.filter(
        (receiver) => receiver !== giver && !(exclusions.get(giver)?.has(receiver) ?? false),
      ),
      random,
    );

    for (const receiver of candidates) {
      if (seenReceivers.has(receiver)) continue;
      seenReceivers.add(receiver);

      const existingGiver = receiverToGiver.get(receiver);
      if (!existingGiver || tryAssign(existingGiver, seenReceivers)) {
        receiverToGiver.set(receiver, giver);
        giverToReceiver.set(giver, receiver);
        return true;
      }
    }

    return false;
  }

  for (const giver of orderedGivers) {
    if (!tryAssign(giver, new Set())) return null;
  }

  return giverToReceiver.size === participantIds.length ? giverToReceiver : null;
}
