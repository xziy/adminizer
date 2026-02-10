import { randomBytes, randomUUID } from "node:crypto";
import { Adminizer } from "../../Adminizer";
import { DataAccessor } from "../../DataAccessor";
import {
  FilterAP,
  FilterCondition,
  FilterSortDirection,
  FilterVisibility
} from "../../../models/FilterAP";
import { FilterColumnAP } from "../../../models/FilterColumnAP";
import { UserAP } from "../../../models/UserAP";
import {
  buildEntity,
  ModelEntry,
  resolveModelEntry
} from "../utils/modelResolver";
import { ActionType } from "../../../interfaces/adminpanelConfig";
import { FilterAuditLogger } from "../FilterAuditLogger";

export type FilterColumnInput = Partial<
  Pick<FilterColumnAP, "fieldName" | "order" | "width" | "isVisible" | "isEditable">
>;

export type FilterCreateInput = {
  name: string;
  modelName: string;
  description?: string;
  conditions?: FilterCondition[];
  selectedFields?: string[];
  sortField?: string;
  sortDirection?: FilterSortDirection;
  visibility?: FilterVisibility;
  groupIds?: number[];
  apiEnabled?: boolean;
  apiKey?: string;
  icon?: string;
  color?: string;
  isPinned?: boolean;
  isSystemFilter?: boolean;
  version?: number;
  schemaVersion?: string;
  slug?: string;
  id?: string;
  owner?: UserAP | number | string;
};

export type FilterUpdateInput = Partial<FilterCreateInput>;

export type PaginatedFilters = {
  data: Partial<FilterAP>[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type FindManyOptions = {
  modelName?: string;
  onlyPinned?: boolean;
  includeSystem?: boolean;
  visibility?: FilterVisibility | FilterVisibility[];
  page?: number;
  limit?: number;
};

export class FilterRepository {
  constructor(
    private readonly adminizer: Adminizer,
    private readonly auditLogger?: FilterAuditLogger
  ) {}

  public async create(
    data: FilterCreateInput,
    columns: FilterColumnInput[] | undefined,
    user: UserAP
  ): Promise<Partial<FilterAP>> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(user, "add", filterEntry);

    const prepared = await this.prepareCreatePayload(data, user);
    const created = await filterEntry.model.create(prepared as FilterAP, accessor);

    if (Array.isArray(columns)) {
      await this.replaceColumns(String(created.id ?? prepared.id), columns, user);
    }

    this.auditLogger?.record("created", {
      filterId: String(created.id ?? prepared.id),
      modelName: prepared.modelName,
      user
    });

    return (await this.findById(String(created.id ?? prepared.id), user)) ?? created;
  }

  public async update(
    filterId: string,
    data: FilterUpdateInput,
    columns: FilterColumnInput[] | undefined,
    user: UserAP
  ): Promise<Partial<FilterAP> | null> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(user, "edit", filterEntry);

    const prepared = await this.prepareUpdatePayload(filterId, data);
    const updated = await filterEntry.model.updateOne({ id: filterId }, prepared, accessor);

    if (!updated) {
      return null;
    }

    if (Array.isArray(columns)) {
      await this.replaceColumns(filterId, columns, user);
    }

    this.auditLogger?.record("updated", {
      filterId,
      modelName: String(updated.modelName ?? data.modelName ?? "unknown"),
      user
    });

    return (await this.findById(filterId, user)) ?? updated;
  }

  public async delete(filterId: string, user: UserAP): Promise<void> {
    await this.replaceColumns(filterId, [], user);

    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(user, "remove", filterEntry);
    await filterEntry.model.destroy({ id: filterId }, accessor);

    this.auditLogger?.record("deleted", { filterId, user });
  }

  public async findById(filterId: string, user: UserAP): Promise<Partial<FilterAP> | null> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(user, "view", filterEntry);
    return filterEntry.model.findOne({ id: filterId }, accessor);
  }

  public async findByIdAsAdmin(filterId: string): Promise<Partial<FilterAP> | null> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(this.createSystemUser(), "view", filterEntry);
    return filterEntry.model.findOne({ id: filterId }, accessor);
  }

  public async findBySlug(slug: string, user: UserAP): Promise<Partial<FilterAP> | null> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(user, "view", filterEntry);
    return filterEntry.model.findOne({ slug }, accessor);
  }

  public async findBySlugAsAdmin(slug: string): Promise<Partial<FilterAP> | null> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(this.createSystemUser(), "view", filterEntry);
    return filterEntry.model.findOne({ slug }, accessor);
  }

  public async findByApiKey(apiKey: string): Promise<Partial<FilterAP> | null> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(this.createSystemUser(), "view", filterEntry);
    return filterEntry.model.findOne({ apiKey, apiEnabled: true }, accessor);
  }

  public async findColumns(filterId: string, user?: UserAP): Promise<FilterColumnAP[]> {
    const columnEntry = this.getFilterColumnEntry();
    const accessor = this.createAccessor(user ?? this.createSystemUser(), "list", columnEntry);
    const data = await columnEntry.model.find(
      {
        where: { filter: filterId },
        sort: "order ASC"
      },
      accessor
    );

    return (data ?? []) as FilterColumnAP[];
  }

  public async findMany(user: UserAP, options: FindManyOptions = {}): Promise<PaginatedFilters> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(user, "list", filterEntry);

    const page = this.normalizePage(options.page);
    const limit = this.normalizeLimit(options.limit);

    const where: Record<string, unknown> = {};

    if (options.modelName) {
      where.modelName = options.modelName;
    }
    if (options.onlyPinned) {
      where.isPinned = true;
    }
    if (!options.includeSystem) {
      where.isSystemFilter = false;
    }

    if (options.visibility) {
      if (Array.isArray(options.visibility)) {
        where.visibility = { in: options.visibility };
      } else {
        where.visibility = options.visibility;
      }
    }

    if (user.isAdministrator) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        filterEntry.model.find(
          {
            where,
            sort: "name ASC",
            skip,
            limit
          },
          accessor
        ),
        filterEntry.model.count({ where }, accessor)
      ]);

      const pages = limit > 0 ? Math.ceil(total / limit) : 1;

      return {
        data: data ?? [],
        total,
        page,
        limit,
        pages
      };
    }

    const [ownedFilters, sharedFilters] = await Promise.all([
      filterEntry.model.find(
        {
          where,
          sort: "name ASC"
        },
        accessor
      ),
      this.findSharedFilters(user, where)
    ]);

    const merged = this.mergeFilters(ownedFilters ?? [], sharedFilters ?? []);
    const paginated = this.paginateFilters(merged, page, limit);

    return paginated;
  }

  private async findSharedFilters(
    user: UserAP,
    baseWhere: Record<string, unknown>
  ): Promise<Partial<FilterAP>[]> {
    const visibility = this.normalizeVisibility(baseWhere.visibility);
    const sharedVisibility = visibility
      ? visibility.filter((item) => item !== "private")
      : ["public", "groups"];

    if (sharedVisibility.length === 0) {
      return [];
    }

    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(this.createSystemUser(), "list", filterEntry);

    const where: Record<string, unknown> = {
      ...baseWhere,
      visibility: { in: sharedVisibility }
    };

    const data = await filterEntry.model.find(
      {
        where,
        sort: "name ASC"
      },
      accessor
    );

    if (!data?.length) {
      return [];
    }

    const userGroupIds = new Set((user.groups ?? []).map((group) => String(group.id)));

    return data.filter((filter) => {
      if (filter.visibility === "public") {
        return true;
      }
      if (filter.visibility === "groups") {
        if (!Array.isArray(filter.groupIds) || filter.groupIds.length === 0) {
          return false;
        }
        return filter.groupIds.some((id) => userGroupIds.has(String(id)));
      }
      return false;
    });
  }

  private mergeFilters(
    primary: Partial<FilterAP>[],
    secondary: Partial<FilterAP>[]
  ): Partial<FilterAP>[] {
    const map = new Map<string, Partial<FilterAP>>();
    const add = (filter: Partial<FilterAP>) => {
      if (!filter?.id) {
        return;
      }
      const id = String(filter.id);
      if (!map.has(id)) {
        map.set(id, filter);
      }
    };

    primary.forEach(add);
    secondary.forEach(add);

    const merged = Array.from(map.values());
    merged.sort((a, b) => {
      const nameA = String(a.name ?? "").toLowerCase();
      const nameB = String(b.name ?? "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return merged;
  }

  private paginateFilters(
    filters: Partial<FilterAP>[],
    page: number,
    limit: number
  ): PaginatedFilters {
    const total = filters.length;
    const pages = limit > 0 ? Math.ceil(total / limit) : 1;
    const start = (page - 1) * limit;
    const end = start + limit;

    return {
      data: filters.slice(start, end),
      total,
      page,
      limit,
      pages
    };
  }

  private normalizeVisibility(
    visibility: unknown
  ): FilterVisibility[] | undefined {
    if (!visibility) {
      return undefined;
    }
    if (Array.isArray(visibility)) {
      return visibility.map((item) => String(item) as FilterVisibility);
    }
    if (typeof visibility === "object") {
      const candidate = (visibility as { in?: unknown }).in;
      if (Array.isArray(candidate)) {
        return candidate.map((item) => String(item) as FilterVisibility);
      }
    }
    return [String(visibility) as FilterVisibility];
  }

  private async prepareCreatePayload(
    data: FilterCreateInput,
    user: UserAP
  ): Promise<FilterCreateInput> {
    const id = data.id ?? randomUUID();
    const baseSlug = data.slug ?? data.name;
    const slug = await this.generateSlugWithRetry(String(baseSlug), undefined);
    const apiEnabled = data.apiEnabled ?? false;
    const apiKey = apiEnabled ? data.apiKey ?? this.generateApiKey() : data.apiKey;

    return {
      ...data,
      id,
      slug,
      owner: data.owner ?? user.id,
      conditions: Array.isArray(data.conditions) ? data.conditions : [],
      selectedFields: this.normalizeSelectedFields(data.selectedFields),
      sortDirection: data.sortDirection ?? "ASC",
      visibility: data.visibility ?? "private",
      groupIds: Array.isArray(data.groupIds) ? data.groupIds : [],
      apiEnabled,
      apiKey,
      isPinned: data.isPinned ?? false,
      isSystemFilter: data.isSystemFilter ?? false,
      version: data.version ?? 1
    };
  }

  private async prepareUpdatePayload(
    filterId: string,
    data: FilterUpdateInput
  ): Promise<FilterUpdateInput> {
    const next: FilterUpdateInput = { ...data };

    if (data.slug) {
      next.slug = await this.generateSlugWithRetry(data.slug, filterId);
    }

    if (data.apiEnabled && !data.apiKey) {
      next.apiKey = this.generateApiKey();
    }

    if (data.groupIds && !Array.isArray(data.groupIds)) {
      next.groupIds = [];
    }

    if (data.conditions && !Array.isArray(data.conditions)) {
      next.conditions = [];
    }

    if ("selectedFields" in data) {
      next.selectedFields = this.normalizeSelectedFields(data.selectedFields);
    }

    return next;
  }

  private async replaceColumns(
    filterId: string,
    columns: FilterColumnInput[],
    user: UserAP
  ): Promise<void> {
    const columnEntry = this.getFilterColumnEntry();
    const removeAccessor = this.createAccessor(user, "remove", columnEntry);
    await columnEntry.model.destroy({ filter: filterId }, removeAccessor);

    if (!Array.isArray(columns) || columns.length === 0) {
      return;
    }

    const addAccessor = this.createAccessor(user, "add", columnEntry);

    const prepared = columns.map((column, index) => ({
      fieldName: column.fieldName,
      order: column.order ?? index,
      width: column.width,
      isVisible: column.isVisible ?? true,
      isEditable: column.isEditable ?? false,
      filter: filterId
    }));

    for (const column of prepared) {
      if (!column.fieldName) {
        continue;
      }
      await columnEntry.model.create(
        column as unknown as FilterColumnAP,
        addAccessor
      );
    }
  }

  private getFilterEntry(): ModelEntry {
    return resolveModelEntry(this.adminizer, "FilterAP");
  }

  private getFilterColumnEntry(): ModelEntry {
    return resolveModelEntry(this.adminizer, "FilterColumnAP");
  }

  private createAccessor(user: UserAP, action: ActionType, entry: ModelEntry): DataAccessor {
    return new DataAccessor(this.adminizer, user, buildEntity(this.adminizer, entry), action);
  }

  private normalizePage(page?: number): number {
    if (!page || !Number.isFinite(page) || page < 1) {
      return 1;
    }
    return Math.floor(page);
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || !Number.isFinite(limit) || limit < 1) {
      return 50;
    }
    return Math.min(100, Math.floor(limit));
  }

  private async generateSlugWithRetry(name: string, existingId?: string): Promise<string> {
    const base = this.slugify(name);
    if (!base) {
      return randomUUID();
    }

    const maxRetries = 5;

    for (let attempt = 0; attempt < maxRetries; attempt += 1) {
      const candidate =
        attempt === 0 ? base : `${base}-${Date.now()}-${attempt}`;

      const exists = await this.slugExists(candidate, existingId);
      if (!exists) {
        return candidate;
      }
    }

    return `${base}-${randomUUID().slice(0, 8)}`;
  }

  private async slugExists(slug: string, existingId?: string): Promise<boolean> {
    const filterEntry = this.getFilterEntry();
    const accessor = this.createAccessor(this.createSystemUser(), "view", filterEntry);
    const found = await filterEntry.model.findOne({ slug }, accessor);
    if (!found) {
      return false;
    }

    if (existingId && String(found.id) === String(existingId)) {
      return false;
    }

    return true;
  }

  private slugify(text: string): string {
    return String(text ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100);
  }

  private generateApiKey(): string {
    return randomBytes(32).toString("hex");
  }

  private normalizeSelectedFields(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized = value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
    return Array.from(new Set(normalized));
  }

  private createSystemUser(): UserAP {
    return {
      id: 0,
      login: "system",
      fullName: "System",
      isAdministrator: true,
      groups: []
    } as UserAP;
  }
}
