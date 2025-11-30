import assert from "node:assert/strict";
import { setCors, maybeHandleCorsOptions } from "../functions/src/cors";

type HeaderMap = Record<string, string>;

function mockRes(): { headers: HeaderMap; setHeader(name: string, value: string): void; status(code: number): any } {
  const headers: HeaderMap = {};
  return {
    headers,
    setHeader(name: string, value: string) {
      headers[name] = value;
    },
    status(code: number) {
      return {
        send(body?: unknown) {
          headers["__status"] = String(code);
          headers["__body"] = body ? String(body) : "";
        },
      };
    },
  };
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test("setCors sets headers", () => {
  const res = mockRes();
  setCors(res);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "*");
  assert.ok(res.headers["Access-Control-Allow-Headers"]);
  assert.ok(res.headers["Access-Control-Allow-Methods"]);
});

test("maybeHandleCorsOptions handles OPTIONS", () => {
  const res = mockRes();
  const handled = maybeHandleCorsOptions({ method: "OPTIONS" }, res);
  assert.equal(handled, true);
  assert.equal(res.headers["__status"], "204");
  assert.equal(res.headers["Access-Control-Allow-Origin"], "*");
});

test("maybeHandleCorsOptions bypasses non-OPTIONS", () => {
  const res = mockRes();
  const handled = maybeHandleCorsOptions({ method: "POST" }, res);
  assert.equal(handled, false);
  assert.equal(res.headers["Access-Control-Allow-Origin"], undefined);
});
