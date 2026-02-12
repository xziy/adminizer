import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { History, RefreshCcw } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { loadRecentFiltersFromStorage, type RecentFilterEntry } from "@/lib/recent-filters";

const resolveRoutePrefix = () => {
  if (typeof window === "undefined") {
    return "/adminizer";
  }
  return window.routePrefix || "/adminizer";
};

const normalizeUrl = (url: string) => {
  const withoutQuery = url.split("?")[0];
  return withoutQuery.replace(/\/$/, "");
};

const buildFilterLink = (routePrefix: string, filter: RecentFilterEntry) => {
  const base = `${routePrefix}/model/${encodeURIComponent(filter.modelName)}`;
  return `${base}?filterId=${encodeURIComponent(filter.id)}`;
};

export const RecentFiltersList: FC = () => {
  const page = usePage();
  const routePrefix = resolveRoutePrefix();
  const activeUrl = normalizeUrl(page.url);
  const [filters, setFilters] = useState<RecentFilterEntry[]>([]);

  const loadRecent = useCallback(() => {
    setFilters(loadRecentFiltersFromStorage());
  }, []);

  // Keep recent filters in sync with local updates and cross-tab storage changes.
  useEffect(() => {
    loadRecent();
    const handleUpdated = () => loadRecent();
    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "adminizer:recent-filters") {
        loadRecent();
      }
    };
    window.addEventListener("adminizer:recent-filters-updated", handleUpdated);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("adminizer:recent-filters-updated", handleUpdated);
      window.removeEventListener("storage", handleStorage);
    };
  }, [loadRecent]);

  const items = useMemo(
    () =>
      filters.map((filter) => ({
        id: filter.id,
        label: filter.name,
        url: buildFilterLink(routePrefix, filter)
      })),
    [filters, routePrefix]
  );

  const isEmpty = items.length === 0;

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>Recent Filters</SidebarGroupLabel>
        <SidebarGroupAction type="button" title="Refresh recent filters" onClick={loadRecent}>
          <RefreshCcw className="h-4 w-4" />
        </SidebarGroupAction>
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild isActive={activeUrl === normalizeUrl(item.url)}>
                <Link href={item.url}>
                  <History className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          {isEmpty && (
            <div className={cn("px-2 py-1 text-xs text-muted-foreground")}>
              Applied filters will appear here.
            </div>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default RecentFiltersList;
