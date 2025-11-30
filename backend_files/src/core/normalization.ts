import { createHash } from "crypto";
import { NormalizedItem } from "./types";

export interface NormalizedItemInput {
  sourceId: string;
  externalId: string;
  data: Record<string, unknown>;
  normalizedAt?: Date;
}

export function buildNormalizedItem(input: NormalizedItemInput): NormalizedItem {
  const normalizedAt = input.normalizedAt ?? new Date();
  const fingerprint = computeFingerprint(input.data);

  return {
    sourceId: input.sourceId,
    externalId: input.externalId,
    normalizedAt,
    fingerprint,
    data: input.data,
  };
}

export function computeFingerprint(data: Record<string, unknown>): string {
  const serialized = stableSerialize(data);
  return createHash("sha256").update(serialized).digest("hex");
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([keyA], [keyB]) =>
    keyA.localeCompare(keyB)
  );

  const serialized = entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableSerialize(val)}`)
    .join(",");

  return `{${serialized}}`;
}
