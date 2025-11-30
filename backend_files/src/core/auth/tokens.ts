import { createHmac, timingSafeEqual } from "crypto";
import { AuthError } from "../errors";
import { UserClaims } from "./types";

const header = { alg: "HS256", typ: "JWT" };

export function signToken(claims: UserClaims, secret: string): string {
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(claims));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = computeSignature(data, secret);
  return `${data}.${signature}`;
}

export function verifyToken(token: string, secret: string): UserClaims {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthError("Invalid token format");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = computeSignature(data, secret);

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    throw new AuthError("Invalid token signature");
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as UserClaims;
    return payload;
  } catch (error) {
    throw new AuthError("Failed to parse token payload", { cause: error });
  }
}

function computeSignature(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}
