import { type FC, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Heart, HeartOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type FilterFavoriteToggleProps = {
  filterId: string;
  isPinned?: boolean;
  className?: string;
};

const resolveRoutePrefix = () => {
  if (typeof window === "undefined") {
    return "/adminizer";
  }
  return window.routePrefix || "/adminizer";
};

export const FilterFavoriteToggle: FC<FilterFavoriteToggleProps> = ({
  filterId,
  isPinned,
  className
}) => {
  const [pinned, setPinned] = useState(Boolean(isPinned));
  const [loading, setLoading] = useState(false);
  const routePrefix = resolveRoutePrefix();

  // Sync local state when the server-provided pinned flag changes.
  useEffect(() => {
    setPinned(Boolean(isPinned));
  }, [isPinned]);

  // Toggle favorite state via filter update API.
  const handleToggle = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.patch(`${routePrefix}/filters/${filterId}`, {
        isPinned: !pinned
      });
      if (!response.data?.success) {
        throw new Error(response.data?.error || "Failed to update favorite");
      }
      const nextPinned = !pinned;
      setPinned(nextPinned);
      toast.success(nextPinned ? "Added to favorites" : "Removed from favorites");
      window.dispatchEvent(new CustomEvent("adminizer:favorite-filters-updated"));
    } catch (error) {
      toast.error("Favorite update failed");
    } finally {
      setLoading(false);
    }
  }, [filterId, pinned, routePrefix]);

  return (
    <Button
      type="button"
      variant={pinned ? "default" : "outline"}
      className={className}
      onClick={handleToggle}
      disabled={loading}
    >
      {pinned ? <Heart className="h-4 w-4" /> : <HeartOff className="h-4 w-4" />}
      {pinned ? "Favorite" : "Add to favorites"}
    </Button>
  );
};

export default FilterFavoriteToggle;
