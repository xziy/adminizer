import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, usePage } from "@inertiajs/react";
import { Heart, RefreshCcw } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton
} from "@/components/ui/sidebar";
import MaterialIcon from "@/components/material-icon";
import { cn } from "@/lib/utils";

type FavoriteFilter = {
  id: string;
  name: string;
  modelName: string;
  icon?: string;
  slug?: string;
};

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

const buildFilterLink = (routePrefix: string, filter: FavoriteFilter) => {
  const base = `${routePrefix}/model/${encodeURIComponent(filter.modelName)}`;
  if (filter.slug) {
    return `${base}?filterSlug=${encodeURIComponent(filter.slug)}`;
  }
  return `${base}?filterId=${encodeURIComponent(filter.id)}`;
};

export const FilterFavoritesList: FC = () => {
  const page = usePage();
  const routePrefix = resolveRoutePrefix();
  const activeUrl = normalizeUrl(page.url);

  const [filters, setFilters] = useState<FavoriteFilter[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await axios.get(`${routePrefix}/filters`, {
        params: { pinned: true }
      });
      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to load favorites");
      }
      setFilters(response.data?.data ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load favorites";
      setErrorMessage(message);
      setFilters([]);
    } finally {
      setIsLoading(false);
    }
  }, [routePrefix]);

  const loadCounts = useCallback(async (items: FavoriteFilter[]) => {
    if (items.length === 0) {
      setCounts({});
      return;
    }

    const nextCounts: Record<string, number> = {};
    await Promise.all(
      items.map(async (filter) => {
        try {
          const response = await axios.get(`${routePrefix}/filters/${filter.id}/count`);
          const count = response.data?.count;
          if (typeof count === "number" && Number.isFinite(count)) {
            nextCounts[filter.id] = Math.max(0, Math.floor(count));
          }
        } catch (error) {
          nextCounts[filter.id] = 0;
        }
      })
    );

    setCounts(nextCounts);
  }, [routePrefix]);

  // Fetch pinned filters and refresh when favorites are updated.
  useEffect(() => {
    void loadFavorites();
    const handleUpdate = () => void loadFavorites();
    window.addEventListener("adminizer:favorite-filters-updated", handleUpdate);
    return () => window.removeEventListener("adminizer:favorite-filters-updated", handleUpdate);
  }, [loadFavorites]);

  // Recompute badge counts whenever the favorite list changes.
  useEffect(() => {
    void loadCounts(filters);
  }, [filters, loadCounts]);

  const refresh = useCallback(() => {
    void loadFavorites();
  }, [loadFavorites]);

  const emptyState = !isLoading && filters.length === 0;

  const menuItems = useMemo(
    () =>
      filters.map((filter) => ({
        id: filter.id,
        label: filter.name,
        icon: filter.icon || "favorite",
        url: buildFilterLink(routePrefix, filter)
      })),
    [filters, routePrefix]
  );

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>Favorite Filters</SidebarGroupLabel>
        <SidebarGroupAction type="button" title="Refresh favorites" onClick={refresh}>
          <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
        </SidebarGroupAction>
      </div>
      <SidebarGroupContent>
        {errorMessage && (
          <div className="px-2 text-xs text-destructive">{errorMessage}</div>
        )}
        <SidebarMenu>
          {isLoading && (
            <>
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
            </>
          )}
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton asChild isActive={activeUrl === normalizeUrl(item.url)}>
                <Link href={item.url}>
                  <MaterialIcon name={item.icon} className="!text-[18px]" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
              {counts[item.id] !== undefined && (
                <SidebarMenuBadge>{counts[item.id]}</SidebarMenuBadge>
              )}
            </SidebarMenuItem>
          ))}
          {emptyState && (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              Mark filters as favorites to show them here.
            </div>
          )}
          {emptyState && (
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3" />
              Favorites stay synced across sessions.
            </div>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default FilterFavoritesList;
