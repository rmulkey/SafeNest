import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "./proxy";

/**
 * The dashboard was publicly readable before this gate existed, so these tests
 * pin the behaviour that matters most: it fails closed, and it does not admit a
 * request without the exact secret.
 */

const TOKEN = "test-admin-token-0123456789";

function req(authHeader?: string) {
  return new NextRequest("https://safenesttoys.com/dashboard/clicks", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const basic = (user: string, pass: string) =>
  `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

// Control the variable explicitly rather than assuming it is absent. A developer
// (or CI) with ADMIN_DASHBOARD_TOKEN exported in their shell would otherwise
// make the fail-closed test pass for the wrong reason, or fail spuriously.
const original = process.env.ADMIN_DASHBOARD_TOKEN;

beforeEach(() => {
  delete process.env.ADMIN_DASHBOARD_TOKEN;
});

afterEach(() => {
  if (original === undefined) delete process.env.ADMIN_DASHBOARD_TOKEN;
  else process.env.ADMIN_DASHBOARD_TOKEN = original;
});

describe("dashboard access control", () => {
  it("is unreachable when no token is configured", () => {
    // A missing env var must not be what opens the dashboard.
    const res = proxy(req(basic("admin", "anything")));
    expect(res.status).toBe(404);
  });

  it("refuses a token that is too short to be meaningful", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = "short";
    expect(proxy(req(basic("admin", "short"))).status).toBe(404);
  });

  it("challenges a request with no credentials", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = TOKEN;
    const res = proxy(req());
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toContain("Basic");
  });

  it("rejects a wrong password", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = TOKEN;
    expect(proxy(req(basic("admin", "wrong"))).status).toBe(401);
  });

  it("rejects a password that is a prefix of the real token", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = TOKEN;
    expect(proxy(req(basic("admin", TOKEN.slice(0, -1)))).status).toBe(401);
  });

  it("rejects a non-Basic scheme", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = TOKEN;
    expect(proxy(req(`Bearer ${TOKEN}`)).status).toBe(401);
  });

  it("rejects malformed base64", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = TOKEN;
    expect(proxy(req("Basic !!!not-base64!!!")).status).toBe(401);
  });

  it("admits the correct token regardless of username", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = TOKEN;
    for (const user of ["admin", "", "anyone"]) {
      const res = proxy(req(basic(user, TOKEN)));
      expect(res.status, `user=${user}`).toBe(200);
    }
  });

  it("marks authenticated dashboard responses noindex and uncacheable", () => {
    process.env.ADMIN_DASHBOARD_TOKEN = TOKEN;
    const res = proxy(req(basic("admin", TOKEN)));
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("only guards the dashboard", () => {
    // A broader matcher would put a password prompt in front of the public site.
    expect(config.matcher).toBe("/dashboard/:path*");
  });
});
