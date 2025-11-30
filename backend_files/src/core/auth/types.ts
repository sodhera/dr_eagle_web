export type UserRole = "user" | "admin";

export type UserTier = "free" | "paid";

export interface UserClaims {
  userId: string;
  role: UserRole;
  tier: UserTier;
  scopes: string[];
  issuedAt: number;
  expiresAt: number;
}
