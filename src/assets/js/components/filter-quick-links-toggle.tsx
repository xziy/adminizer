import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type QuickLinkEntry = {
  id: string;
  filterId: string;
};

type FilterQuickLinksToggleProps = {
  filterId: string;
  filterName?: string;
  className?: string;
};

const resolveRoutePrefix = () => {
  if (typeof window === "undefined") {
    return "/adminizer";
  }
  return window.routePrefix || "/adminizer";
};

export const FilterQuickLinksToggle: FC<FilterQuickLinksToggleProps> = ({
  filterId,
  filterName,
  className
}) => {
  const [entries, setEntries] = useState<QuickLinkEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const routePrefix = useMemo(() => resolveRoutePrefix(), []);

  // Load current quick links to resolve whether the filter is pinned.
  const loadEntries = useCallback(async () => {
    try {
      const response = await axios.get(`${routePrefix}/filters/quick-links`);
      if (response.data?.success) {
        const data = response.data?.data ?? [];
        setEntries(
          data.map((item: any) => ({
            id: String(item.id),
            filterId: String(item.filterId)
          }))
        );
      }
    } catch (error) {
      setEntries([]);
    }
  }, [routePrefix]);

  // Keep pin state synced with sidebar quick link updates.
  useEffect(() => {
    void loadEntries();
    const handleUpdate = () => void loadEntries();
    window.addEventListener("adminizer:quick-links-updated", handleUpdate);
    return () => window.removeEventListener("adminizer:quick-links-updated", handleUpdate);
  }, [loadEntries]);

  const isPinned = entries.some((entry) => entry.filterId === filterId);

  // Toggle quick link state by calling the quick links API.
  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      if (isPinned) {
        await axios.delete(`${routePrefix}/filters/${filterId}/quick-links`);
        toast.success("Removed from quick links");
      } else {
        await axios.post(`${routePrefix}/filters/${filterId}/quick-links`, {
          customName: filterName
        });
        toast.success("Added to quick links");
      }

      await loadEntries();
      window.dispatchEvent(new CustomEvent("adminizer:quick-links-updated"));
    } catch (error) {
      toast.error("Quick links update failed");
    } finally {
      setLoading(false);
    }
  }, [filterId, filterName, isPinned, loadEntries, routePrefix]);

  return (
    <Button
      type="button"
      variant={isPinned ? "default" : "outline"}
      className={className}
      onClick={handleToggle}
      disabled={loading}
    >
      {isPinned ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
      {isPinned ? "Pinned" : "Pin"}
    </Button>
  );
};

export default FilterQuickLinksToggle;
