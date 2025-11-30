import { AccessPolicy } from "./accessPolicy";
import { UserClaims } from "../../core";
import { AccessDeniedError } from "../../core/errors";

export interface UserSpace {
  customInstructions: string[];
  chats: string[];
  usedTools: string[];
  customSystems: string[];
}

export interface AdminSpace {
  sharedFeeds: string[];
  sharedSystems: string[];
}

export interface SecureVault {
  getUserSpace(userId: string): UserSpace;
  upsertUserSpace(userId: string, update: Partial<UserSpace>): UserSpace;
  getAdminSpace(): AdminSpace;
  upsertAdminSpace(update: Partial<AdminSpace>): AdminSpace;
}

export class InMemorySecureVault implements SecureVault {
  private readonly userSpaces = new Map<string, UserSpace>();
  private adminSpace: AdminSpace = { sharedFeeds: [], sharedSystems: [] };

  getUserSpace(userId: string): UserSpace {
    const existing = this.userSpaces.get(userId);
    if (existing) return existing;
    const created: UserSpace = { customInstructions: [], chats: [], usedTools: [], customSystems: [] };
    this.userSpaces.set(userId, created);
    return created;
  }

  upsertUserSpace(userId: string, update: Partial<UserSpace>): UserSpace {
    const current = this.getUserSpace(userId);
    const next: UserSpace = {
      customInstructions: update.customInstructions ?? current.customInstructions,
      chats: update.chats ?? current.chats,
      usedTools: update.usedTools ?? current.usedTools,
      customSystems: update.customSystems ?? current.customSystems,
    };
    this.userSpaces.set(userId, next);
    return next;
  }

  getAdminSpace(): AdminSpace {
    return this.adminSpace;
  }

  upsertAdminSpace(update: Partial<AdminSpace>): AdminSpace {
    this.adminSpace = {
      sharedFeeds: update.sharedFeeds ?? this.adminSpace.sharedFeeds,
      sharedSystems: update.sharedSystems ?? this.adminSpace.sharedSystems,
    };
    return this.adminSpace;
  }
}

export class VaultService {
  constructor(private readonly vault: SecureVault) {}

  readUserSpace(claims: UserClaims, policy: AccessPolicy, userId: string): UserSpace {
    enforceUserIsolation(claims, userId);
    return this.vault.getUserSpace(userId);
  }

  readAdminSpace(claims: UserClaims, policy: AccessPolicy): AdminSpace {
    if (!policy.allowAdminPool) {
      throw new AccessDeniedError("Admin pool is restricted to admin roles");
    }
    return this.vault.getAdminSpace();
  }

  updateUserSpace(claims: UserClaims, policy: AccessPolicy, update: Partial<UserSpace>): UserSpace {
    enforceUserIsolation(claims, claims.userId);
    return this.vault.upsertUserSpace(claims.userId, update);
  }

  updateAdminSpace(claims: UserClaims, policy: AccessPolicy, update: Partial<AdminSpace>): AdminSpace {
    if (!policy.allowAdminPool) {
      throw new AccessDeniedError("Admin pool is restricted to admin roles");
    }
    return this.vault.upsertAdminSpace(update);
  }
}

function enforceUserIsolation(claims: UserClaims, ownerId: string): void {
  if (claims.userId !== ownerId) {
    throw new AccessDeniedError("Access denied to another user's space");
  }
}
