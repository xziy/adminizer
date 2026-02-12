import { Adminizer } from "../Adminizer";
import { InfoBase } from "./abstractInfo";
import { MaterialIcon } from "../../interfaces/MaaterialIcons";
import { UserAP } from "../../models/UserAP";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

export type FilterCountWidgetOptions = {
  id: string;
  filterId: string;
  name?: string;
  description?: string;
  icon?: MaterialIcon | string;
  department?: string;
  backgroundCSS?: string;
  size?: { h: number; w: number } | null;
  linkType?: "self" | "blank";
  routePrefix?: string;
  refreshIntervalSec?: number;
  errorValue?: string;
};

type FilterLike = {
  id?: string;
  modelName?: string;
};

// The widget calculates saved-filter counts and caches them for short intervals.
export class FilterCountWidget extends InfoBase {
  public readonly widgetType = "info";
  public readonly id: string;
  public readonly filterId: string;
  public readonly name: string;
  public readonly description: string;
  public readonly icon?: MaterialIcon | string;
  public readonly department: string;

  private readonly errorValue: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly adminizer: Adminizer;

  constructor(adminizer: Adminizer, options: FilterCountWidgetOptions) {
    super();
    this.adminizer = adminizer;
    this.id = options.id;
    this.filterId = options.filterId;
    this.name = options.name ?? "Filter Count";
    this.description = options.description ?? "Saved filter result count";
    this.icon = options.icon ?? "filter_alt";
    this.department = options.department ?? "Filters";
    // Assign inherited readonly widget properties through a narrowed mutable view.
    const mutableWidget = this as unknown as {
      backgroundCSS: string;
      size: { h: number; w: number } | null;
      linkType: "self" | "blank";
      refreshIntervalSec: number;
      link: string;
    };
    mutableWidget.backgroundCSS = options.backgroundCSS ?? "#0F766E";
    mutableWidget.size = options.size ?? { h: 2, w: 2 };
    mutableWidget.linkType = options.linkType ?? "self";
    mutableWidget.refreshIntervalSec = Math.max(1, options.refreshIntervalSec ?? 60);
    this.errorValue = options.errorValue ?? "0";
    const prefix = (options.routePrefix ?? adminizer.config?.routePrefix ?? "/adminizer").replace(/\/+$/, "");
    mutableWidget.link = `${prefix}/filter/${encodeURIComponent(this.filterId)}`;
  }

  // The value is resolved for the active user and cached to avoid repeated queries.
  public async getInfo(req?: ReqType): Promise<string> {
    const user = this.resolveUser(req);
    const cacheKey = `${user.id}:${this.filterId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const value = await this.loadCountValue(user);
    this.cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.refreshIntervalSec * 1000
    });
    return value;
  }

  public invalidateCache(): void {
    this.cache.clear();
  }

  private resolveUser(req?: ReqType): UserAP {
    if (req?.user) {
      return req.user;
    }
    return {
      id: 0,
      login: "system",
      fullName: "System",
      isAdministrator: true,
      groups: []
    };
  }

  private async loadCountValue(user: UserAP): Promise<string> {
    const filtersModule = this.adminizer.filters as any;
    if (!filtersModule?.repository || !filtersModule?.execution || !filtersModule?.access) {
      return this.errorValue;
    }

    const filter = (await filtersModule.repository.findByIdAsAdmin(this.filterId)) as FilterLike | null;
    if (!filter) {
      return this.errorValue;
    }

    try {
      filtersModule.access.assertCanExecute(filter, user);
    } catch {
      return this.errorValue;
    }

    try {
      const count = await filtersModule.execution.count(filter, user);
      return String(typeof count === "number" && Number.isFinite(count) ? count : 0);
    } catch {
      return this.errorValue;
    }
  }
}
