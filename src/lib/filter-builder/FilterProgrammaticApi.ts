import { FilterAP } from "../../models/FilterAP";
import { UserAP } from "../../models/UserAP";
import {
  FilterColumnInput,
  FilterCreateInput,
  FilterUpdateInput,
  FindManyOptions,
  PaginatedFilters
} from "../filters/repository/FilterRepository";

export type ProgrammaticHookName =
  | "beforeCreate"
  | "afterCreate"
  | "beforeUpdate"
  | "afterUpdate"
  | "beforeDelete"
  | "afterDelete";

type ProgrammaticHookHandler = (
  payload: Record<string, unknown>
) => void | Promise<void>;

export interface ProgrammaticFilterRepository {
  create(
    data: FilterCreateInput,
    columns: FilterColumnInput[] | undefined,
    user: UserAP
  ): Promise<Partial<FilterAP>>;
  update(
    filterId: string,
    data: FilterUpdateInput,
    columns: FilterColumnInput[] | undefined,
    user: UserAP
  ): Promise<Partial<FilterAP> | null>;
  delete(filterId: string, user: UserAP): Promise<void>;
  findById(filterId: string, user: UserAP): Promise<Partial<FilterAP> | null>;
  findBySlug(slug: string, user: UserAP): Promise<Partial<FilterAP> | null>;
  findMany(user: UserAP, options?: FindManyOptions): Promise<PaginatedFilters>;
}

/**
 * Executes programmatic filter CRUD via repository with lifecycle hooks.
 * Use this API for scripted and configuration-based filter management.
 */
export class FilterProgrammaticApi {
  private readonly hooks: Record<ProgrammaticHookName, ProgrammaticHookHandler[]> = {
    beforeCreate: [],
    afterCreate: [],
    beforeUpdate: [],
    afterUpdate: [],
    beforeDelete: [],
    afterDelete: []
  };

  constructor(
    private readonly repository: ProgrammaticFilterRepository,
    private readonly user: UserAP
  ) {}

  /**
   * Registers lifecycle hook handler.
   * Handlers are executed in registration order.
   */
  public on(hook: ProgrammaticHookName, handler: ProgrammaticHookHandler): this {
    this.hooks[hook].push(handler);
    return this;
  }

  /**
   * Creates filter using repository and runs create hooks.
   * Returns created filter payload.
   */
  public async create(
    data: FilterCreateInput,
    columns?: FilterColumnInput[]
  ): Promise<Partial<FilterAP>> {
    await this.runHook("beforeCreate", { data, columns, user: this.user });
    const created = await this.repository.create(data, columns, this.user);
    await this.runHook("afterCreate", { data, columns, created, user: this.user });
    return created;
  }

  /**
   * Updates filter and runs update hooks.
   * Returns null when filter was not found.
   */
  public async update(
    filterId: string,
    data: FilterUpdateInput,
    columns?: FilterColumnInput[]
  ): Promise<Partial<FilterAP> | null> {
    await this.runHook("beforeUpdate", { filterId, data, columns, user: this.user });
    const updated = await this.repository.update(filterId, data, columns, this.user);
    await this.runHook("afterUpdate", {
      filterId,
      data,
      columns,
      updated,
      user: this.user
    });
    return updated;
  }

  /**
   * Deletes filter by id and runs delete hooks.
   */
  public async delete(filterId: string): Promise<void> {
    await this.runHook("beforeDelete", { filterId, user: this.user });
    await this.repository.delete(filterId, this.user);
    await this.runHook("afterDelete", { filterId, user: this.user });
  }

  /**
   * Finds a filter by id in current user scope.
   */
  public findById(filterId: string): Promise<Partial<FilterAP> | null> {
    return this.repository.findById(filterId, this.user);
  }

  /**
   * Finds a filter by slug in current user scope.
   */
  public findBySlug(slug: string): Promise<Partial<FilterAP> | null> {
    return this.repository.findBySlug(slug, this.user);
  }

  /**
   * Lists filters in current user scope.
   */
  public findMany(options: FindManyOptions = {}): Promise<PaginatedFilters> {
    return this.repository.findMany(this.user, options);
  }

  /**
   * Executes hook handlers sequentially.
   * Async handlers are awaited before next step.
   */
  private async runHook(
    hook: ProgrammaticHookName,
    payload: Record<string, unknown>
  ): Promise<void> {
    for (const handler of this.hooks[hook]) {
      await handler(payload);
    }
  }
}
