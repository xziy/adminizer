import { FilterAP } from "../../../models/FilterAP";
import { UserAP } from "../../../models/UserAP";
import { Adminizer } from "../../Adminizer";

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class FilterAccessService {
  private static readonly MAX_PERMISSION_CACHE_ENTRIES = 5000;
  private readonly permissionCache = new Map<string, boolean>();

  constructor(private readonly adminizer: Adminizer) {}

  public canView(filter: Partial<FilterAP>, user: UserAP): boolean {
    return this.resolveWithCache("view", filter, user, () => {
      if (user.isAdministrator) {
        return true;
      }

      const ownerId = this.resolveOwnerId(filter);
      if (ownerId !== undefined && ownerId === user.id) {
        return true;
      }

      if (filter.visibility === "public") {
        return true;
      }

      if (filter.visibility === "groups" && Array.isArray(filter.groupIds)) {
        const filterGroupIds = filter.groupIds.map((id) => String(id));
        const userGroupIds = (user.groups ?? []).map((group) => String(group.id));
        return filterGroupIds.some((id) => userGroupIds.includes(id));
      }

      return false;
    });
  }

  public canEdit(filter: Partial<FilterAP>, user: UserAP): boolean {
    return this.resolveWithCache("edit", filter, user, () => {
      if (user.isAdministrator) {
        return true;
      }

      const ownerId = this.resolveOwnerId(filter);
      return ownerId !== undefined && ownerId === user.id;
    });
  }

  public canExecute(filter: Partial<FilterAP>, user: UserAP): boolean {
    return this.canView(filter, user);
  }

  public canUseRawSQL(user: UserAP): boolean {
    return user.isAdministrator === true;
  }

  public assertCanView(filter: Partial<FilterAP>, user: UserAP): void {
    if (!this.canView(filter, user)) {
      this.logSecurityEvent("VIEW_DENIED", filter.id, user);
      throw new ForbiddenError("Access denied: cannot view this filter");
    }
  }

  public assertCanEdit(filter: Partial<FilterAP>, user: UserAP): void {
    if (!this.canEdit(filter, user)) {
      this.logSecurityEvent("EDIT_DENIED", filter.id, user);
      throw new ForbiddenError("Access denied: cannot edit this filter");
    }
  }

  public assertCanExecute(filter: Partial<FilterAP>, user: UserAP): void {
    if (!this.canExecute(filter, user)) {
      this.logSecurityEvent("EXECUTE_DENIED", filter.id, user);
      throw new ForbiddenError("Access denied: cannot execute this filter");
    }
  }

  private resolveOwnerId(filter: Partial<FilterAP>): string | number | undefined {
    const owner = filter.owner as unknown;
    if (owner === null || owner === undefined) {
      return undefined;
    }

    if (typeof owner === "string" || typeof owner === "number") {
      return owner;
    }

    if (typeof owner === "object" && "id" in (owner as { id?: string | number })) {
      return (owner as { id?: string | number }).id;
    }

    return undefined;
  }

  private resolveWithCache(
    action: "view" | "edit",
    filter: Partial<FilterAP>,
    user: UserAP,
    compute: () => boolean
  ): boolean {
    const cacheKey = this.buildPermissionCacheKey(action, filter, user);
    const cached = this.permissionCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const result = compute();
    this.putCacheEntry(cacheKey, result);
    return result;
  }

  private buildPermissionCacheKey(
    action: "view" | "edit",
    filter: Partial<FilterAP>,
    user: UserAP
  ): string {
    const ownerId = this.resolveOwnerId(filter);
    const userGroupIds = (user.groups ?? []).map((group) => String(group.id)).sort().join(",");
    const filterGroupIds = Array.isArray(filter.groupIds)
      ? filter.groupIds.map((id) => String(id)).sort().join(",")
      : "";

    return [
      action,
      String(user.id),
      String(user.isAdministrator === true),
      userGroupIds,
      String(filter.id ?? ""),
      String(ownerId ?? ""),
      String(filter.visibility ?? ""),
      filterGroupIds
    ].join("|");
  }

  private putCacheEntry(key: string, value: boolean): void {
    if (this.permissionCache.size >= FilterAccessService.MAX_PERMISSION_CACHE_ENTRIES) {
      this.permissionCache.clear();
    }
    this.permissionCache.set(key, value);
  }

  private logSecurityEvent(event: string, filterId: string | undefined, user: UserAP): void {
    const safeFilterId = filterId ?? "unknown";
    Adminizer.log.warn(
      `[SECURITY] ${event}: filter=${safeFilterId}, user=${user.id} (${user.login})`
    );
  }
}
