export type Role = "user" | "admin";

const PUBLIC_SCOPES = ["polymarket:read:public"] as const;
const USER_SCOPES = ["polymarket:read:public", "polymarket:read:user", "polymarket:read:stream"] as const;
const ADMIN_SCOPES = ["admin:read", ...USER_SCOPES] as const;

export function resolveMcpScopes(requested: string[] | undefined, role: Role): string[] {
  const allowed = new Set(role === "admin" ? ADMIN_SCOPES : USER_SCOPES);
  const base = role === "admin" ? PUBLIC_SCOPES : PUBLIC_SCOPES;
  const scopes = (requested && requested.length ? requested : base).filter((scope) => allowed.has(scope as any));
  const deduped = Array.from(new Set(scopes));
  return deduped.length ? deduped : Array.from(base);
}
