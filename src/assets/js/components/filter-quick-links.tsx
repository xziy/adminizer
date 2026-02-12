import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { Link, usePage } from "@inertiajs/react";
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton
} from "@/components/ui/sidebar";
import MaterialIcon from "@/components/material-icon";
import { cn } from "@/lib/utils";

type FilterQuickLink = {
  id: string;
  name: string;
  icon: string;
  urlPath: string;
  filterId: string;
  modelName: string;
  sortOrder: number;
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

const reorderQuickLinks = (
  links: FilterQuickLink[],
  activeId: string,
  overId?: string
) => {
  if (!overId || activeId === overId) {
    return links;
  }
  const oldIndex = links.findIndex((link) => link.id === activeId);
  const newIndex = links.findIndex((link) => link.id === overId);
  if (oldIndex < 0 || newIndex < 0) {
    return links;
  }
  return arrayMove(links, oldIndex, newIndex);
};

const SortableQuickLinkItem: FC<{
  link: FilterQuickLink;
  isEditing: boolean;
  isActive: boolean;
  badgeCount?: number;
  onRemove: () => void;
}> = ({ link, isEditing, isActive, badgeCount, onRemove }) => {
  // Enable drag-and-drop for each quick link when edit mode is active.
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: link.id,
    disabled: !isEditing
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-70")}>
      <SidebarMenuItem>
        {isEditing ? (
          <>
            <SidebarMenuButton type="button" className="cursor-default">
              <button
                type="button"
                className="text-muted-foreground"
                {...attributes}
                {...listeners}
                aria-label="Reorder quick link"
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <MaterialIcon name={link.icon} className="!text-[18px]" />
              <span className="flex-1 truncate">{link.name}</span>
              {badgeCount !== undefined && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {badgeCount}
                </span>
              )}
            </SidebarMenuButton>
            <SidebarMenuAction
              type="button"
              onClick={onRemove}
              title="Remove quick link"
              showOnHover
            >
              <Trash2 className="h-4 w-4" />
            </SidebarMenuAction>
          </>
        ) : (
          <>
            <SidebarMenuButton asChild isActive={isActive}>
              <Link href={link.urlPath}>
                <MaterialIcon name={link.icon} className="!text-[18px]" />
                <span>{link.name}</span>
              </Link>
            </SidebarMenuButton>
            {badgeCount !== undefined && (
              <SidebarMenuBadge>{badgeCount}</SidebarMenuBadge>
            )}
          </>
        )}
      </SidebarMenuItem>
    </div>
  );
};

export const FilterQuickLinks: FC = () => {
  const page = usePage();
  const [links, setLinks] = useState<FilterQuickLink[]>([]);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Keep drag sensors consistent with other sortable lists.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const routePrefix = resolveRoutePrefix();
  const activeUrl = normalizeUrl(page.url);

  const loadQuickLinks = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.get(`${routePrefix}/filters/quick-links`);
      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to load quick links");
      }

      const items = (response.data?.data ?? []) as FilterQuickLink[];
      const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
      setLinks(sortedItems);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load quick links";
      setErrorMessage(message);
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  }, [routePrefix]);

  const loadBadgeCounts = useCallback(async (items: FilterQuickLink[]) => {
    if (items.length === 0) {
      setBadgeCounts({});
      return;
    }

    const counts: Record<string, number> = {};
    await Promise.all(
      items.map(async (link) => {
        try {
          const response = await axios.get(`${routePrefix}/filters/${link.filterId}/count`);
          const count = response.data?.count;
          if (typeof count === "number" && Number.isFinite(count)) {
            counts[link.id] = Math.max(0, Math.floor(count));
          }
        } catch (error) {
          counts[link.id] = 0;
        }
      })
    );

    setBadgeCounts(counts);
  }, [routePrefix]);

  // Fetch quick links once and refresh when filters update.
  useEffect(() => {
    void loadQuickLinks();
    const handleUpdate = () => void loadQuickLinks();
    window.addEventListener("adminizer:quick-links-updated", handleUpdate);
    return () => window.removeEventListener("adminizer:quick-links-updated", handleUpdate);
  }, [loadQuickLinks]);

  // Refresh badge counts whenever the list of quick links changes.
  useEffect(() => {
    void loadBadgeCounts(links);
  }, [links, loadBadgeCounts]);

  const handleDragEnd = useCallback(
    async (event: { active: { id: string }; over?: { id: string } }) => {
      if (!isEditing) {
        return;
      }
      const nextLinks = reorderQuickLinks(links, event.active.id, event.over?.id);
      if (nextLinks === links) {
        return;
      }

      setLinks(nextLinks);
      setIsSavingOrder(true);
      try {
        await axios.post(`${routePrefix}/filters/quick-links/reorder`, {
          orderedIds: nextLinks.map((link) => link.id)
        });
      } catch (error) {
        setErrorMessage("Unable to save quick link order.");
      } finally {
        setIsSavingOrder(false);
      }
    },
    [isEditing, links, routePrefix]
  );

  const handleRemove = useCallback(
    async (link: FilterQuickLink) => {
      try {
        await axios.delete(`${routePrefix}/filters/${link.filterId}/quick-links`);
        setLinks((current) => current.filter((item) => item.id !== link.id));
        window.dispatchEvent(new CustomEvent("adminizer:quick-links-updated"));
      } catch (error) {
        setErrorMessage("Unable to remove quick link.");
      }
    },
    [routePrefix]
  );

  const handleRefresh = useCallback(async () => {
    await loadQuickLinks();
  }, [loadQuickLinks]);

  const isEmpty = !isLoading && links.length === 0;

  const sortedIds = useMemo(() => links.map((link) => link.id), [links]);

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>Quick Filters</SidebarGroupLabel>
        <div className="flex items-center gap-1">
          <SidebarGroupAction
            type="button"
            title={isEditing ? "Done" : "Edit quick links"}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </SidebarGroupAction>
          <SidebarGroupAction
            type="button"
            title="Refresh quick links"
            onClick={handleRefresh}
          >
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </SidebarGroupAction>
        </div>
      </div>
      <SidebarGroupContent>
        {errorMessage && (
          <div className="px-2 text-xs text-destructive">{errorMessage}</div>
        )}
        {isSavingOrder && (
          <div className="px-2 text-xs text-muted-foreground">Saving order...</div>
        )}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
            <SidebarMenu>
              {isLoading && (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              )}
              {links.map((link) => (
                <SortableQuickLinkItem
                  key={link.id}
                  link={link}
                  isEditing={isEditing}
                  isActive={activeUrl === normalizeUrl(link.urlPath)}
                  badgeCount={badgeCounts[link.id]}
                  onRemove={() => handleRemove(link)}
                />
              ))}
              {isEmpty && (
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  Pin saved filters to show them here.
                </div>
              )}
            </SidebarMenu>
          </SortableContext>
        </DndContext>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export default FilterQuickLinks;
