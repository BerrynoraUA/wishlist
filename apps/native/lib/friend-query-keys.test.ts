import { hashKey } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { friendKeys } from "./friend-query-keys";

describe("friend query keys", () => {
  it("keeps finite and infinite friend payloads in separate caches", () => {
    expect(
      hashKey(friendKeys.list("user-1", { skip: undefined, take: 20, search: undefined })),
    ).not.toBe(hashKey(friendKeys.infiniteList("user-1", { take: 20, search: undefined })));
  });

  it("keeps finite and infinite group payloads in separate caches", () => {
    expect(
      hashKey(friendKeys.groupList("user-1", { skip: undefined, take: 20, search: undefined })),
    ).not.toBe(hashKey(friendKeys.infiniteGroupList("user-1", { take: 20, search: undefined })));
  });
});
