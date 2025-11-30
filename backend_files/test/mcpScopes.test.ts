import assert from "node:assert/strict";
import { resolveMcpScopes } from "../src/app/security/mcpScopes";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

test("defaults to public scope when none requested", () => {
  const scopes = resolveMcpScopes(undefined, "user");
  assert.deepEqual(scopes, ["polymarket:read:public"]);
});

test("filters to allowed scopes for user role", () => {
  const scopes = resolveMcpScopes(["polymarket:read:user", "admin:read"], "user");
  assert.deepEqual(scopes, ["polymarket:read:user"]);
});

test("allows admin scope when admin role requests it", () => {
  const scopes = resolveMcpScopes(["admin:read", "polymarket:read:stream"], "admin");
  assert.deepEqual(scopes.sort(), ["admin:read", "polymarket:read:stream"].sort());
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
