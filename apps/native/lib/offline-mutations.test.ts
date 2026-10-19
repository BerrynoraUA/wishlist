import { onlineManager } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import {
  OFFLINE_QUEUE_KEY,
  OfflineError,
  rejectMutationWhileOffline,
  shouldPersistMutation,
} from "./offline-mutations";

function mutation({
  key,
  meta,
  isPaused = false,
}: {
  key?: readonly unknown[];
  meta?: Record<string, unknown>;
  isPaused?: boolean;
}) {
  return { options: { mutationKey: key, meta }, state: { isPaused } };
}

afterEach(() => onlineManager.setOnline(true));

describe("rejectMutationWhileOffline", () => {
  it("lets every mutation through while online", () => {
    expect(() => rejectMutationWhileOffline(undefined, mutation({}))).not.toThrow();
  });

  it("fails ordinary mutations while offline", () => {
    onlineManager.setOnline(false);

    expect(() => rejectMutationWhileOffline(undefined, mutation({}))).toThrow(OfflineError);
  });

  it("lets queued and waiting mutations pause while offline", () => {
    onlineManager.setOnline(false);

    expect(() =>
      rejectMutationWhileOffline(undefined, mutation({ key: [OFFLINE_QUEUE_KEY, "items"] })),
    ).not.toThrow();
    expect(() =>
      rejectMutationWhileOffline(undefined, mutation({ meta: { offline: "wait" } })),
    ).not.toThrow();
  });
});

describe("shouldPersistMutation", () => {
  it("saves only paused queued mutations", () => {
    expect(shouldPersistMutation(mutation({ key: [OFFLINE_QUEUE_KEY], isPaused: true }))).toBe(
      true,
    );
    expect(shouldPersistMutation(mutation({ key: [OFFLINE_QUEUE_KEY] }))).toBe(false);
    expect(shouldPersistMutation(mutation({ meta: { offline: "wait" }, isPaused: true }))).toBe(
      false,
    );
  });
});
