import assert from "node:assert/strict";
import { compareMovement, summarizeMovement, PriceHistory } from "../src/core";

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function test(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function makeHistory(tokenId: string, points: Array<{ t: number; p: number }>): PriceHistory {
  return {
    tokenId,
    history: points.map((point) => ({
      timestamp: new Date(point.t * 1000),
      price: point.p,
    })),
  };
}

test("detects dominant movement by absolute change", () => {
  const left = summarizeMovement(
    makeHistory("left", [
      { t: 1, p: 1 },
      { t: 2, p: 2 },
    ])
  );
  const right = summarizeMovement(
    makeHistory("right", [
      { t: 1, p: 1 },
      { t: 2, p: 1.1 },
    ])
  );

  const result = compareMovement(left, right);
  assert.equal(result.dominant, "left");
  assert.ok(result.rationale.includes("Left selection moved more"));
});

test("returns tie when movements are equal magnitude", () => {
  const left = summarizeMovement(
    makeHistory("left", [
      { t: 1, p: 1 },
      { t: 2, p: 1.5 },
    ])
  );
  const right = summarizeMovement(
    makeHistory("right", [
      { t: 1, p: 3 },
      { t: 2, p: 3.5 },
    ])
  );

  const result = compareMovement(left, right);
  assert.equal(result.dominant, "tie");
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
