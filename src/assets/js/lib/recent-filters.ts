export type RecentFilterEntry = {
  id: string;
  name: string;
  modelName: string;
  visitedAt: string;
};

export const RECENT_FILTERS_STORAGE_KEY = "adminizer:recent-filters";
const RECENT_FILTERS_LIMIT = 10;

// Parse and normalize serialized recent filter entries from storage.
export const parseRecentFilters = (raw: unknown): RecentFilterEntry[] => {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): RecentFilterEntry | null => {
        const id = String(item?.id ?? "").trim();
        const name = String(item?.name ?? "").trim();
        const modelName = String(item?.modelName ?? "").trim();
        const visitedAt = String(item?.visitedAt ?? "").trim();
        if (!id || !name || !modelName || !visitedAt) {
          return null;
        }
        return { id, name, modelName, visitedAt };
      })
      .filter((item): item is RecentFilterEntry => item !== null)
      .sort((left, right) => right.visitedAt.localeCompare(left.visitedAt))
      .slice(0, RECENT_FILTERS_LIMIT);
  } catch (error) {
    return [];
  }
};

// Insert or refresh a recent filter entry with stable max size ordering.
export const upsertRecentFilters = (
  current: RecentFilterEntry[],
  next: Omit<RecentFilterEntry, "visitedAt">
): RecentFilterEntry[] => {
  const id = String(next.id ?? "").trim();
  const name = String(next.name ?? "").trim();
  const modelName = String(next.modelName ?? "").trim();
  if (!id || !name || !modelName) {
    return current;
  }

  const now = new Date().toISOString();
  const filtered = current.filter((item) => item.id !== id);
  return [{ id, name, modelName, visitedAt: now }, ...filtered].slice(0, RECENT_FILTERS_LIMIT);
};

// Read recent filter entries from localStorage in browser-safe way.
export const loadRecentFiltersFromStorage = (): RecentFilterEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }
  return parseRecentFilters(window.localStorage.getItem(RECENT_FILTERS_STORAGE_KEY));
};

// Persist a visited filter and emit update event for sidebar widgets.
export const storeRecentFilterVisit = (entry: Omit<RecentFilterEntry, "visitedAt">): void => {
  if (typeof window === "undefined") {
    return;
  }

  const current = loadRecentFiltersFromStorage();
  const next = upsertRecentFilters(current, entry);
  window.localStorage.setItem(RECENT_FILTERS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("adminizer:recent-filters-updated"));
};
