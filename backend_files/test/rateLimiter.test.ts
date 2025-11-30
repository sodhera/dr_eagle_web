import assert from "node:assert/strict";
import { FixedWindowRateLimiter } from "../src/app/security";
import { AccessDeniedError, UserClaims } from "../src/core";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const userClaims: UserClaims = {
  userId: "user-1",
  role: "user",
  tier: "free",
  scopes: ["polymarket:read:public"],
  issuedAt: 0,
  expiresAt: 1000,
};

const adminClaims: UserClaims = {
  userId: "admin-1",
  role: "admin",
  tier: "paid",
  scopes: ["admin:read", "polymarket:read:public", "polymarket:read:stream", "polymarket:read:user"],
  issuedAt: 0,
  expiresAt: 1000,
};

test("blocks users who exceed the per-window limit", () => {
  const limiter = new FixedWindowRateLimiter(1, 60_000);
  limiter.consume(userClaims, "public");
  assert.throws(() => limiter.consume(userClaims, "public"), AccessDeniedError);
});

test("admins bypass rate limits", () => {
  const limiter = new FixedWindowRateLimiter(1, 60_000);
  limiter.consume(adminClaims, "public");
  limiter.consume(adminClaims, "public");
  limiter.consume(adminClaims, "public");
});

async function run(): Promise<void> {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(error);
      process.exitCode = 1;
      return;
    }
  }
}

void run();
