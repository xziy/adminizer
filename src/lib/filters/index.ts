import { Adminizer } from "../Adminizer";
import { FilterAuditLogger } from "./FilterAuditLogger";
import { FilterRepository } from "./repository/FilterRepository";
import { FilterAccessService } from "./services/FilterAccessService";
import { FilterService } from "./services/FilterService";
import { FilterExecutionService } from "./services/FilterExecutionService";
import { FilterConfigService } from "./services/FilterConfigService";
import { ConditionValidator } from "./validators/ConditionValidator";
import { FilterMigrationService } from "./services/FilterMigrationService";

export class FilterModule {
  public readonly audit: FilterAuditLogger;
  public readonly repository: FilterRepository;
  public readonly access: FilterAccessService;
  public readonly service: FilterService;
  public readonly execution: FilterExecutionService;
  public readonly config: FilterConfigService;
  public readonly validator: ConditionValidator;
  public readonly migration: FilterMigrationService;

  constructor(private readonly adminizer: Adminizer) {
    this.audit = new FilterAuditLogger(adminizer);
    this.repository = new FilterRepository(adminizer, this.audit);
    this.access = new FilterAccessService(adminizer);
    // Centralize shared filter utilities and parsing in a single service.
    this.service = new FilterService();
    this.config = new FilterConfigService(adminizer);
    this.execution = new FilterExecutionService(adminizer);
    this.validator = new ConditionValidator(adminizer, this.access);
    this.migration = new FilterMigrationService(adminizer, this.validator);
  }
}

export { FilterAuditLogger } from "./FilterAuditLogger";
export { FilterRepository } from "./repository/FilterRepository";
export { FilterAccessService, ForbiddenError } from "./services/FilterAccessService";
export { FilterService } from "./services/FilterService";
export { FilterExecutionService } from "./services/FilterExecutionService";
export { FilterConfigService } from "./services/FilterConfigService";
export { FilterMigrationService, FILTER_FORMAT_VERSION, FILTER_VERSION_MIGRATIONS } from "./services/FilterMigrationService";
export { ConditionValidator } from "./validators/ConditionValidator";
export * from "./middleware/filterRateLimit";
