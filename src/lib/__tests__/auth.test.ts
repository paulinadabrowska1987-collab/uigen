// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mockCookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mockCookieStore),
}));

import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "@/lib/auth";

const COOKIE_NAME = "auth-token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

async function makeToken(
  payload: Record<string, unknown>,
  expSeconds?: number
) {
  const exp =
    expSeconds !== undefined
      ? expSeconds
      : Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

describe("createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("sets the auth cookie", async () => {
    await createSession("user-1", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe(COOKIE_NAME);
  });

  test("cookie contains a valid JWT with userId and email", async () => {
    await createSession("user-1", "user@example.com");

    const [, token] = mockCookieStore.set.mock.calls[0];
    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-1");
    expect(payload.email).toBe("user@example.com");
  });

  test("cookie expires in approximately 7 days", async () => {
    const before = Date.now();
    await createSession("user-1", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    expect(options.expires.getTime()).toBeGreaterThanOrEqual(
      before + sevenDays - 1000
    );
    expect(options.expires.getTime()).toBeLessThanOrEqual(
      after + sevenDays + 1000
    );
  });

  test("cookie has httpOnly, lax sameSite, and root path", async () => {
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie is not secure outside production", async () => {
    await createSession("user-1", "user@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);
  });
});

describe("getSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("returns null when cookie is absent", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    expect(await getSession()).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await makeToken({
      userId: "user-1",
      email: "user@example.com",
      expiresAt,
    });
    mockCookieStore.get.mockReturnValue({ value: token });

    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-1");
    expect(session?.email).toBe("user@example.com");
  });

  test("returns null for a malformed token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.jwt" });
    expect(await getSession()).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 60;
    const token = await makeToken(
      { userId: "user-1", email: "user@example.com" },
      expiredAt
    );
    mockCookieStore.get.mockReturnValue({ value: token });

    expect(await getSession()).toBeNull();
  });
});

describe("deleteSession", () => {
  beforeEach(() => vi.clearAllMocks());

  test("deletes the auth cookie", async () => {
    await deleteSession();

    expect(mockCookieStore.delete).toHaveBeenCalledOnce();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(COOKIE_NAME);
  });
});

describe("verifySession", () => {
  function makeRequest(cookie?: string) {
    return new NextRequest("http://localhost/api/test", {
      headers: cookie ? { Cookie: cookie } : {},
    });
  }

  test("returns null when request has no cookie", async () => {
    expect(await verifySession(makeRequest())).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = await makeToken({
      userId: "user-2",
      email: "verify@example.com",
      expiresAt,
    });
    const session = await verifySession(
      makeRequest(`${COOKIE_NAME}=${token}`)
    );

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-2");
    expect(session?.email).toBe("verify@example.com");
  });

  test("returns null for a malformed token", async () => {
    expect(
      await verifySession(makeRequest(`${COOKIE_NAME}=bad.token.here`))
    ).toBeNull();
  });

  test("returns null for an expired token", async () => {
    const expiredAt = Math.floor(Date.now() / 1000) - 60;
    const token = await makeToken(
      { userId: "user-3", email: "old@example.com" },
      expiredAt
    );
    expect(
      await verifySession(makeRequest(`${COOKIE_NAME}=${token}`))
    ).toBeNull();
  });

  test("ignores an unrelated cookie", async () => {
    expect(
      await verifySession(makeRequest("other-cookie=somevalue"))
    ).toBeNull();
  });
});
