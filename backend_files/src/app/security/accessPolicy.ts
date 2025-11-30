import { AccessDeniedError, UserClaims } from "../../core";

export interface AccessPolicy {
  allowAdminPool: boolean;
  allowHighFrequency: boolean;
  maxConcurrentAgentActions: number;
}

export interface AgentContext {
  claims: UserClaims;
  policy: AccessPolicy;
}

export function deriveAccessPolicy(claims: UserClaims): AccessPolicy {
  const allowAdminPool = claims.role === "admin";
  const allowHighFrequency = allowAdminPool || claims.tier === "paid";

  return {
    allowAdminPool,
    allowHighFrequency,
    maxConcurrentAgentActions: allowAdminPool ? 10 : allowHighFrequency ? 5 : 2,
  };
}

export function buildAgentContext(claims: UserClaims): AgentContext {
  return {
    claims,
    policy: deriveAccessPolicy(claims),
  };
}

export function assertScope(claims: UserClaims, scope: string): void {
  if (!claims.scopes.includes(scope)) {
    throw new AccessDeniedError(`Missing required scope: ${scope}`);
  }
}

export function assertUserIsolation(claims: UserClaims, ownerId: string): void {
  if (claims.userId !== ownerId) {
    throw new AccessDeniedError("Cannot access another user's private space");
  }
}
