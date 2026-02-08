import { randomBytes } from "node:crypto";
import { Adminizer } from "../Adminizer";
import type { UserAP } from "../../models/UserAP";
import { resolveModelEntry, buildEntity } from "../filters/utils/modelResolver";
import { DataAccessor } from "../DataAccessor";

const TOKEN_PREFIX = "ap_";
const TOKEN_BYTES = 32;

export type ApiTokenInfo = {
  token: string;
  createdAt: Date;
};

/**
 * Handles creation, validation, and revocation of per-user public API tokens.
 */
export class ApiTokenManager {
  constructor(private readonly adminizer: Adminizer) {}

  /**
   * Returns an existing token or creates a new one for the user.
   */
  public async getOrCreateToken(user: UserAP): Promise<ApiTokenInfo> {
    if (!user) {
      throw new Error("User is required");
    }

    const existing = await this.loadUserToken(user.id);
    if (existing?.token) {
      return existing;
    }

    return this.generateAndPersistToken(user);
  }

  /**
   * Generates a new token and overwrites the existing one.
   */
  public async regenerateToken(user: UserAP): Promise<ApiTokenInfo> {
    if (!user) {
      throw new Error("User is required");
    }

    return this.generateAndPersistToken(user);
  }

  /**
   * Clears the stored token for the user.
   */
  public async revokeToken(user: UserAP): Promise<void> {
    if (!user) {
      throw new Error("User is required");
    }

    const accessor = this.createAccessor(this.buildSystemUser());
    const updated = await accessor.entity.model.updateOne(
      { id: user.id },
      { apiToken: "", apiTokenCreatedAt: null },
      accessor
    );
    if (!updated) {
      throw new Error("User not found");
    }
  }

  /**
   * Finds an active user by token or returns null.
   */
  public async validateToken(token: string): Promise<UserAP | null> {
    if (!token || !token.startsWith(TOKEN_PREFIX)) {
      return null;
    }

    const trimmed = token.trim();
    if (!trimmed || trimmed.length < TOKEN_PREFIX.length + 10) {
      return null;
    }

    const accessor = this.createAccessor(this.buildSystemUser(), "view");
    const record = await accessor.entity.model.findOne({ apiToken: trimmed }, accessor);
    if (!record) {
      return null;
    }

    const user = record as UserAP;
    if (user.isActive === false || user.isDeleted === true) {
      return null;
    }

    return user;
  }

  /**
   * Returns token metadata for the user, if present.
   */
  public async getTokenInfo(user: UserAP): Promise<ApiTokenInfo | null> {
    if (!user) {
      return null;
    }
    return this.loadUserToken(user.id);
  }

  private async generateAndPersistToken(user: UserAP): Promise<ApiTokenInfo> {
    const createdAt = new Date();
    const accessor = this.createAccessor(this.buildSystemUser());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = this.generateToken();
      try {
        const updated = await accessor.entity.model.updateOne(
          { id: user.id },
          { apiToken: token, apiTokenCreatedAt: createdAt },
          accessor
        );
        if (!updated) {
          throw new Error("User not found");
        }
        return { token, createdAt };
      } catch (error) {
        if (attempt >= 4) {
          throw error;
        }
      }
    }

    throw new Error("Failed to generate a unique API token");
  }

  private async loadUserToken(userId: number): Promise<ApiTokenInfo | null> {
    const accessor = this.createAccessor(this.buildSystemUser(), "view");
    const record = await accessor.entity.model.findOne({ id: userId }, accessor);
    if (!record) {
      return null;
    }

    const user = record as UserAP;
    if (!user.apiToken) {
      return null;
    }

    return {
      token: user.apiToken,
      createdAt: user.apiTokenCreatedAt ?? new Date(0)
    };
  }

  private generateToken(): string {
    return `${TOKEN_PREFIX}${randomBytes(TOKEN_BYTES).toString("hex")}`;
  }

  private createAccessor(user: UserAP, action: "edit" | "view" = "edit"): DataAccessor {
    const entry = resolveModelEntry(this.adminizer, "UserAP");
    const entity = buildEntity(this.adminizer, entry);
    const fields = {
      ...(entity.config?.fields ?? {}),
      apiToken: { title: "API Token" },
      apiTokenCreatedAt: { title: "API Token Created At" }
    };
    const config = {
      ...entity.config,
      fields
    };

    return new DataAccessor(
      this.adminizer,
      user,
      { ...entity, config },
      action
    );
  }

  private buildSystemUser(): UserAP {
    return {
      id: 0,
      login: "system",
      fullName: "System",
      isAdministrator: true,
      groups: []
    } as UserAP;
  }
}
