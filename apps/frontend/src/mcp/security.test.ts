import { describe, expect, it } from "vitest";
import { validMcpClaims } from "./auth";
import { confirmationSignature, validConfirmation } from "./tools";
import { safeItem } from "./results";
import { sameParticipants } from "./santa";
import { publicLookup } from "./images";

describe("OAuth token boundaries", () => {
  const expected = {
    issuer: "https://example.supabase.co/auth/v1",
    resource: "https://wishlane.example/api/mcp",
    clientIds: ["chatgpt", "claude"],
  };
  const claims = {
    iss: expected.issuer,
    aud: expected.resource,
    client_id: "chatgpt",
    sub: "user",
    role: "authenticated",
    exp: 2000,
  };
  it("accepts the intended OAuth resource and each configured client", () => {
    expect(validMcpClaims(claims, expected, 1000)).toBe(true);
    expect(validMcpClaims({ ...claims, client_id: "claude" }, expected, 1000)).toBe(true);
  });
  it.each([
    { aud: "authenticated" },
    { client_id: "another-client" },
    { client_id: undefined },
    { iss: "https://other.supabase.co/auth/v1" },
    { exp: 1000 },
    { nbf: 1001 },
    { role: "service_role" },
    { sub: undefined },
  ])("rejects tokens with invalid claims: %j", (bad) => {
    expect(validMcpClaims({ ...claims, ...bad }, expected, 1000)).toBe(false);
  });
});

describe("confirmation capabilities", () => {
  it("binds confirmations to the action, user and OAuth client", () => {
    const sig = confirmationSignature("action", "alice", "chatgpt", "secret");
    expect(validConfirmation(sig, sig)).toBe(true);
    for (const args of [
      ["other", "alice", "chatgpt"],
      ["action", "bob", "chatgpt"],
      ["action", "alice", "other"],
    ]) {
      expect(
        validConfirmation(sig, confirmationSignature(args[0], args[1], args[2], "secret")),
      ).toBe(false);
    }
    expect(validConfirmation("malformed", sig)).toBe(false);
  });
  it("detects a changed Secret Santa draw roster without treating order as a change", () => {
    expect(
      sameParticipants(
        { participants: [{ id: "a" }, { id: "b" }] },
        { participants: [{ id: "b" }, { id: "a" }] },
      ),
    ).toBe(true);
    expect(sameParticipants({ participants: [{ id: "a" }] }, { participants: [{ id: "b" }] })).toBe(
      false,
    );
  });
});

describe("gift privacy", () => {
  const item = {
    id: "wish",
    name: "Surprise",
    status: 2,
    reserved_by: "giver",
    secret: "never forward",
    owner_id: "owner",
  };
  it("hides others' gift state and identities from the owner", () => {
    expect(safeItem(item, "owner", "owner")).toEqual({
      id: "wish",
      name: "Surprise",
      reserved_by_me: false,
      bought_by_me: false,
    });
  });
  it("shows availability to shoppers without identifying the giver", () => {
    const safe = safeItem(item, "shopper", "owner");
    expect(safe.status).toBe(2);
    expect(safe).not.toHaveProperty("reserved_by");
    expect(safe).not.toHaveProperty("secret");
  });
  it("shows the caller's own gift state", () => {
    expect(safeItem(item, "giver", "owner").bought_by_me).toBe(true);
  });
});

describe("chat attachment downloads", () => {
  const resolve = (hostname: string, all: boolean) =>
    new Promise<unknown>((done) =>
      publicLookup(hostname, { all }, (error, address) => done(error ?? address)),
    );

  it.each(["127.0.0.1", "localhost", "169.254.169.254", "10.1.2.3", "::1", "::ffff:127.0.0.1"])(
    "refuses %s before connecting",
    async (hostname) => {
      for (const all of [false, true])
        expect(await resolve(hostname, all)).toMatchObject({ message: "Blocked address" });
    },
  );

  it("allows public addresses", async () => {
    expect(await resolve("93.184.215.14", false)).toBe("93.184.215.14");
  });
});
