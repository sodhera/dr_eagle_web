import assert from "node:assert/strict";
import { deriveAccessPolicy } from "../src/app/security/accessPolicy";
import { InMemorySecureVault, VaultService } from "../src/app/security/secureVault";
import { AccessDeniedError, UserClaims } from "../src/core";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

const baseClaims: UserClaims = {
  userId: "user-1",
  role: "user",
  tier: "free",
  scopes: ["markets:read"],
  issuedAt: 0,
  expiresAt: 1000,
};

const adminClaims: UserClaims = {
  userId: "admin-user",
  role: "admin",
  tier: "paid",
  scopes: ["markets:read", "analysis:read", "admin:read"],
  issuedAt: 0,
  expiresAt: 1000,
};

test("enforces per-user isolation when reading user spaces", () => {
  const vaultService = new VaultService(new InMemorySecureVault());
  const policy = deriveAccessPolicy(baseClaims);

  assert.throws(() => vaultService.readUserSpace(baseClaims, policy, "other-user"), AccessDeniedError);
});

test("restricts admin pool to admin role", () => {
  const vaultService = new VaultService(new InMemorySecureVault());
  const policy = deriveAccessPolicy(adminClaims);
  const adminSpace = vaultService.readAdminSpace(adminClaims, policy);

  assert.deepEqual(adminSpace.sharedFeeds, []);
  const userPolicy = deriveAccessPolicy(baseClaims);
  assert.throws(() => vaultService.readAdminSpace(baseClaims, userPolicy), AccessDeniedError);
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
