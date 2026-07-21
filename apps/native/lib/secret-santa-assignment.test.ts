import { describe, expect, it } from "vitest";
import { generateSecretSantaAssignment } from "./secret-santa-assignment";

const stableRandom = () => 0.5;

describe("Secret Santa matching", () => {
  it("produces a complete one-to-one assignment without self matches", () => {
    const participants = ["a", "b", "c", "d"];
    const assignment = generateSecretSantaAssignment(participants, new Map(), stableRandom);

    expect(assignment).not.toBeNull();
    expect(new Set(assignment?.values()).size).toBe(participants.length);
    for (const participant of participants) {
      expect(assignment?.get(participant)).not.toBe(participant);
    }
  });

  it("uses augmenting paths for constrained but solvable groups", () => {
    const participants = ["a", "b", "c", "d"];
    const exclusions = new Map([
      ["a", new Set(["c", "d"])],
      ["b", new Set(["a", "d"])],
      ["c", new Set(["a", "b"])],
      ["d", new Set(["b", "c"])],
    ]);

    const assignment = generateSecretSantaAssignment(participants, exclusions, stableRandom);

    expect(assignment).toEqual(
      new Map([
        ["a", "b"],
        ["b", "c"],
        ["c", "d"],
        ["d", "a"],
      ]),
    );
  });

  it("returns null when exclusions make a complete assignment impossible", () => {
    const participants = ["a", "b", "c"];
    const exclusions = new Map([["a", new Set(["b", "c"])]]);

    expect(generateSecretSantaAssignment(participants, exclusions, stableRandom)).toBeNull();
  });
});
