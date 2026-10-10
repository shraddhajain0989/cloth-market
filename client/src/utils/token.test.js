import { describe, expect, it } from "vitest";
import { getValidatedTokenRole, isTokenExpired, parseJwt } from "./token";

describe("JWT Client Token Security Utility", () => {
  // Helper to create a fake signed base64 JWT string for testing client parsing
  function createFakeJwt(payload) {
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = btoa(JSON.stringify(payload));
    const sig = "fake_signature_bytes";
    return `${header}.${body}.${sig}`;
  }

  it("should return null for null, undefined, or empty token", () => {
    expect(parseJwt(null)).toBeNull();
    expect(parseJwt("")).toBeNull();
    expect(parseJwt(undefined)).toBeNull();
    expect(parseJwt(12345)).toBeNull();
  });

  it("should return null for malformed tokens without 3 parts", () => {
    expect(parseJwt("invalid.token")).toBeNull();
    expect(parseJwt("singlepart")).toBeNull();
  });

  it("should correctly parse valid JWT payload", () => {
    const token = createFakeJwt({ sub: "user-123", role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 });
    const parsed = parseJwt(token);
    expect(parsed).not.toBeNull();
    expect(parsed.sub).toBe("user-123");
    expect(parsed.role).toBe("admin");
  });

  it("should detect expired token", () => {
    const expiredToken = createFakeJwt({ sub: "user-123", role: "admin", exp: Math.floor(Date.now() / 1000) - 60 });
    expect(isTokenExpired(expiredToken)).toBe(true);
    expect(getValidatedTokenRole(expiredToken)).toBeNull();
  });

  it("should return validated role for active token", () => {
    const activeToken = createFakeJwt({ sub: "user-123", role: "master", exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(isTokenExpired(activeToken)).toBe(false);
    expect(getValidatedTokenRole(activeToken)).toBe("master");
  });

  it("should reject role extraction if token has no role claim", () => {
    const tokenNoRole = createFakeJwt({ sub: "user-123", exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(getValidatedTokenRole(tokenNoRole)).toBeNull();
  });
});
