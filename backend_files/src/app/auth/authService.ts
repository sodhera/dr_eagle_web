import { AccessDeniedError, AuthError, UserClaims, UserRole, UserTier, signToken, verifyToken } from "../../core";
import { AuthConfig } from "../../config";

export interface TokenRequest {
  clientId: string;
  clientSecret: string;
  userId: string;
  role?: UserRole;
  tier?: UserTier;
  scopes?: string[];
}

export interface AuthenticatedContext {
  token: string;
  claims: UserClaims;
}

export class AuthService {
  constructor(private readonly config: AuthConfig) { }

  issueToken(request: TokenRequest): AuthenticatedContext {
    if (request.clientId !== this.config.clientId || request.clientSecret !== this.config.clientSecret) {
      throw new AuthError("Invalid OAuth client credentials");
    }

    const role: UserRole = request.role ?? "user";
    if (role === "admin" && !this.config.adminUserIds.has(request.userId)) {
      throw new AccessDeniedError("User is not allowed to assume admin role");
    }

    const tier: UserTier = request.tier ?? "free";
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + this.config.tokenTtlSeconds;
    const scopes = normalizeScopes(request.scopes, role);

    const claims: UserClaims = {
      userId: request.userId,
      role,
      tier,
      scopes,
      issuedAt,
      expiresAt,
    };

    const token = signToken(claims, this.config.signingKey);
    return { token, claims };
  }

  authenticate(token?: string): AuthenticatedContext {
    if (!token) {
      throw new AuthError("Missing bearer token");
    }

    const claims = verifyToken(token, this.config.signingKey);
    const now = Math.floor(Date.now() / 1000);

    if (claims.expiresAt <= now) {
      throw new AuthError("Token expired");
    }

    return { token, claims };
  }
}

export function parseBearerToken(headerValue: string | undefined): string | undefined {
  if (!headerValue) return undefined;
  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer") return undefined;
  return token;
}

function normalizeScopes(requestedScopes: string[] | undefined, role: UserRole): string[] {
  const defaults = ["polymarket:read:public", "markets:read", "analysis:read"];
  const scopes = new Set(defaults);

  if (requestedScopes) {
    for (const scope of requestedScopes) {
      scopes.add(scope);
    }
  }

  if (role === "admin") {
    scopes.add("admin:read");
  }

  return Array.from(scopes);
}
