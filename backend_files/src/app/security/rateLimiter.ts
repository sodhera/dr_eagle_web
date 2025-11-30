import { AccessDeniedError, UserClaims } from "../../core";

export interface RateLimiter {
  consume(claims: UserClaims, key: string, limitOverride?: number): void;
}

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Simple fixed-window per-user limiter. Admins bypass limits.
 */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly defaultLimit: number, private readonly windowMs: number) {}

  consume(claims: UserClaims, key: string, limitOverride?: number): void {
    if (claims.role === "admin") return;

    const limit = limitOverride ?? this.defaultLimit;
    const now = Date.now();
    const bucketKey = `${claims.userId}:${key}`;
    const bucket = this.resetBucketIfNeeded(bucketKey, now);

    if (bucket.count >= limit) {
      throw new AccessDeniedError(`Rate limit exceeded for ${key}; limit ${limit} per ${this.windowMs / 1000}s`);
    }

    bucket.count += 1;
    this.buckets.set(bucketKey, bucket);
  }

  private resetBucketIfNeeded(bucketKey: string, now: number): Bucket {
    const existing = this.buckets.get(bucketKey);
    if (!existing) {
      return { count: 0, windowStart: now };
    }

    if (now - existing.windowStart >= this.windowMs) {
      return { count: 0, windowStart: now };
    }

    return existing;
  }
}
