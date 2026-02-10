import { v4 as uuid } from "uuid";
import { Adminizer } from "../Adminizer";
import { NavItem } from "../catalog/Navigation";
import { FilterLinkGenerator } from "./FilterLinkGenerator";

export interface FilterQuickLink {
  id: string;
  name: string;
  icon: string;
  urlPath: string;
  filterId: string;
  filterSlug?: string;
  modelName: string;
  sortOrder: number;
}

export interface AddFilterQuickLinkOptions {
  filterId: string;
  sectionId?: string;
  customName?: string;
  icon?: string;
}

export class FilterNavigationService {
  constructor(private readonly adminizer: Adminizer) {}

  // Add a saved filter as a navigation shortcut to the selected section.
  public async addFilterToNavigation(options: AddFilterQuickLinkOptions): Promise<FilterQuickLink> {
    const navigationStorage = this.resolveStorage(options.sectionId);
    const filter = await this.resolveFilter(options.filterId);

    const existing = await this.findExistingQuickLink(navigationStorage.getId(), options.filterId);
    if (existing) {
      throw new Error("Filter is already added to quick links");
    }

    const nextSortOrder = await this.getNextSortOrder(navigationStorage.getId());
    const routePrefix = this.adminizer.config.routePrefix;
    const modelName = String(filter.modelName ?? "").trim();
    const filterSlug = typeof filter.slug === "string" ? filter.slug : undefined;
    const normalizedName = this.resolveLinkName(filter.name, options.customName);

    const item: NavItem = {
      id: uuid(),
      name: normalizedName,
      type: "filter",
      icon: this.resolveIcon(options.icon),
      parentId: null,
      sortOrder: nextSortOrder,
      modelId: String(filter.id),
      urlPath: FilterLinkGenerator.generateUrl({
        routePrefix,
        modelName,
        filterId: String(filter.id),
        filterSlug
      }),
      visible: true
    };

    await navigationStorage.setElement(item.id, item);

    return {
      id: String(item.id),
      name: item.name,
      icon: item.icon,
      urlPath: String(item.urlPath ?? ""),
      filterId: String(filter.id),
      filterSlug,
      modelName,
      sortOrder: item.sortOrder
    };
  }

  // Return all filter quick links for a section in stable order.
  public async listNavigationFilters(sectionId?: string): Promise<FilterQuickLink[]> {
    const navigationStorage = this.resolveStorage(sectionId);
    const allItems = await navigationStorage.getAllElements();

    return allItems
      .filter((item) => item.type === "filter" && item.modelId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => ({
        id: String(item.id),
        name: item.name,
        icon: this.resolveIcon(item.icon),
        urlPath: String(item.urlPath ?? ""),
        filterId: String(item.modelId),
        modelName: this.extractModelName(item.urlPath),
        sortOrder: item.sortOrder
      }));
  }

  // Reorder quick links according to a full ordered list of ids.
  public async reorder(sectionId: string | undefined, orderedIds: string[]): Promise<void> {
    const navigationStorage = this.resolveStorage(sectionId);

    for (let index = 0; index < orderedIds.length; index += 1) {
      const item = await navigationStorage.findElementById(orderedIds[index]);
      if (!item || item.type !== "filter") {
        continue;
      }

      await navigationStorage.setElement(item.id, {
        ...item,
        sortOrder: index
      });
    }
  }

  // Remove an existing quick link by filter identifier.
  public async removeFilterFromNavigation(filterId: string, sectionId?: string): Promise<void> {
    const navigationStorage = this.resolveStorage(sectionId);
    const existing = await this.findExistingQuickLink(navigationStorage.getId(), filterId);

    if (!existing) {
      throw new Error("Filter quick link does not exist");
    }

    await navigationStorage.removeElementById(existing.id);
  }

  // Keep icon values predictable to simplify rendering and testing.
  public resolveIcon(icon?: string): string {
    const value = typeof icon === "string" ? icon.trim() : "";
    return value.length > 0 ? value : "filter_alt";
  }

  // Compute badge value for quick-links view from API count response.
  public calculateBadgeCount(totalRecords: number | null | undefined): number {
    if (typeof totalRecords !== "number" || Number.isNaN(totalRecords)) {
      return 0;
    }

    return totalRecords >= 0 ? Math.floor(totalRecords) : 0;
  }

  private resolveStorage(sectionId?: string) {
    const services = this.adminizer.storageServices;
    if (!services) {
      throw new Error("Navigation is not configured");
    }

    const fallbackSection = this.adminizer.config.navigation?.sections?.[0];
    const targetSection = sectionId || fallbackSection;
    if (!targetSection) {
      throw new Error("Navigation section is required");
    }

    const storage = services.get(targetSection);
    if (!storage) {
      throw new Error(`Navigation section \"${targetSection}\" was not found`);
    }

    return storage;
  }

  private async resolveFilter(filterId: string): Promise<Record<string, unknown>> {
    const id = String(filterId ?? "").trim();
    if (!id) {
      throw new Error("filterId is required");
    }

    const filter = await this.adminizer.filters.repository.findByIdAsAdmin(id);
    if (!filter || !filter.id) {
      throw new Error(`Filter \"${id}\" was not found`);
    }

    if (!filter.modelName) {
      throw new Error(`Filter \"${id}\" does not have modelName`);
    }

    return filter as unknown as Record<string, unknown>;
  }

  private async findExistingQuickLink(sectionId: string, filterId: string): Promise<NavItem | undefined> {
    const storage = this.resolveStorage(sectionId);
    const items = await storage.getAllElements();
    return items.find((item) => item.type === "filter" && String(item.modelId) === String(filterId));
  }

  private async getNextSortOrder(sectionId: string): Promise<number> {
    const storage = this.resolveStorage(sectionId);
    const items = await storage.getAllElements();

    if (items.length === 0) {
      return 0;
    }

    const maxSortOrder = Math.max(...items.map((item) => item.sortOrder ?? 0));
    return maxSortOrder + 1;
  }

  private resolveLinkName(filterName: unknown, customName?: string): string {
    const custom = typeof customName === "string" ? customName.trim() : "";
    if (custom) {
      return custom;
    }

    const defaultName = typeof filterName === "string" ? filterName.trim() : "";
    return defaultName || "Saved filter";
  }

  private extractModelName(urlPath?: string): string {
    if (!urlPath || typeof urlPath !== "string") {
      return "";
    }

    const marker = "/model/";
    const markerIndex = urlPath.indexOf(marker);
    if (markerIndex < 0) {
      return "";
    }

    const encoded = urlPath.slice(markerIndex + marker.length).split("?")[0];
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }
}

export default FilterNavigationService;
