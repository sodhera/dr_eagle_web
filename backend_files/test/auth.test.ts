import assert from "node:assert/strict";
import { AuthService } from "../src/app/auth";
import { AuthError, AccessDeniedError } from "../src/core";
import { AuthConfig } from "../src/config/env";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function expectThrow(fn: () => unknown, expected: new (...args: any[]) => Error): void {
  let threw = false;
  try {
    fn();
  } catch (error) {
    threw = true;
    assert.ok(error instanceof expected, `Expected ${expected.name} but got ${error}`);
  }
  if (!threw) {
    assert.fail(`Expected ${expected.name} to be thrown`);
  }
}

const baseConfig: AuthConfig = {
  clientId: "client-id",
  clientSecret: "client-secret",
  signingKey: "signing-key",
  tokenTtlSeconds: 3600,
  adminUserIds: new Set(["admin-user"]),
};

test("issues and authenticates token with default scopes", () => {
  const service = new AuthService(baseConfig);
  const { token, claims } = service.issueToken({
    clientId: "client-id",
    clientSecret: "client-secret",
    userId: "user-123",
  });

  assert.equal(claims.userId, "user-123");
  assert.ok(claims.scopes.includes("markets:read"));

  const verified = service.authenticate(token);
  assert.equal(verified.claims.userId, "user-123");
  assert.ok(verified.claims.scopes.includes("analysis:read"));
});

test("rejects invalid client secret", () => {
  const service = new AuthService(baseConfig);
  expectThrow(() => {
    service.issueToken({
      clientId: "client-id",
      clientSecret: "wrong",
      userId: "user-123",
    });
  }, AuthError);
});

test("rejects admin role for non-admin user", () => {
  const service = new AuthService(baseConfig);
  expectThrow(() => {
    service.issueToken({
      clientId: "client-id",
      clientSecret: "client-secret",
      userId: "not-admin",
      role: "admin",
    });
  }, AccessDeniedError);
});

test("rejects expired tokens", () => {
  const service = new AuthService({ ...baseConfig, tokenTtlSeconds: -1 });
  const { token } = service.issueToken({
    clientId: "client-id",
    clientSecret: "client-secret",
    userId: "user-123",
  });

  expectThrow(() => {
    service.authenticate(token);
  }, AuthError);
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
