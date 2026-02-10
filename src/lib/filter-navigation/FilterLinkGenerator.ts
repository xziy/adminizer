export interface FilterLinkGeneratorOptions {
  routePrefix?: string;
  modelName?: string;
  filterId?: string;
  filterSlug?: string;
}

export class FilterLinkGenerator {
  // Build a stable admin URL for opening list data with a saved filter.
  public static generateUrl(options: FilterLinkGeneratorOptions): string {
    const routePrefix = this.normalizeRoutePrefix(options.routePrefix);
    const modelName = this.normalizeModelName(options.modelName);

    if (!modelName) {
      throw new Error("modelName is required to generate filter quick link");
    }

    const query = this.buildQuery(options.filterId, options.filterSlug);
    const basePath = `${routePrefix}/model/${encodeURIComponent(modelName)}`;
    return query.length > 0 ? `${basePath}?${query}` : basePath;
  }

  // Normalize route prefix to avoid duplicate or missing slashes.
  private static normalizeRoutePrefix(routePrefix?: string): string {
    const fallbackPrefix = "/adminizer";
    const value = typeof routePrefix === "string" ? routePrefix.trim() : "";

    if (!value) {
      return fallbackPrefix;
    }

    const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
    return withLeadingSlash.endsWith("/")
      ? withLeadingSlash.slice(0, -1)
      : withLeadingSlash;
  }

  // Normalize model name to a plain non-empty identifier.
  private static normalizeModelName(modelName?: string): string {
    if (typeof modelName !== "string") {
      return "";
    }

    return modelName.trim();
  }

  // Use filter slug when available and fallback to filter id.
  private static buildQuery(filterId?: string, filterSlug?: string): string {
    const slug = typeof filterSlug === "string" ? filterSlug.trim() : "";
    const id = typeof filterId === "string" ? filterId.trim() : "";

    if (slug.length > 0) {
      return `filterSlug=${encodeURIComponent(slug)}`;
    }

    if (id.length > 0) {
      return `filterId=${encodeURIComponent(id)}`;
    }

    return "";
  }
}

export default FilterLinkGenerator;
