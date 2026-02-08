import { Adminizer } from "../../Adminizer";

export class FilterConfigService {
  constructor(private readonly adminizer: Adminizer) {}

  public isFiltersEnabled(): boolean {
    return this.adminizer.config.filtersEnabled !== false;
  }

  public isFiltersEnabledForModel(modelName: string): boolean {
    if (!this.isFiltersEnabled()) {
      return false;
    }

    const modelConfig = this.getModelFilterConfig(modelName);
    if (!modelConfig) {
      return true;
    }

    if (modelConfig.enabled !== undefined) {
      return modelConfig.enabled !== false;
    }

    if (modelConfig.useLegacySearch) {
      return false;
    }

    return true;
  }

  public shouldUseLegacySearch(modelName: string): boolean {
    const modelConfig = this.getModelFilterConfig(modelName);
    if (modelConfig?.useLegacySearch) {
      return true;
    }

    return !this.isFiltersEnabledForModel(modelName);
  }

  private getModelFilterConfig(
    modelName: string
  ): { enabled?: boolean; useLegacySearch?: boolean } | undefined {
    const modelFilters = this.adminizer.config.modelFilters;
    if (!modelFilters) {
      return undefined;
    }

    const direct = modelFilters[modelName];
    if (direct) {
      return direct;
    }

    const entry = Object.entries(modelFilters).find(
      ([name]) => name.toLowerCase() === modelName.toLowerCase()
    );

    return entry?.[1];
  }
}
