import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TriangleAlert } from "lucide-react";

type FilterValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  needsMigration: boolean;
  version: number;
};

interface FilterMigrationAlertProps {
  filterId: string;
  onMigrated?: () => void;
  className?: string;
}

const getRoutePrefix = (): string => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.routePrefix ?? "";
};

export const FilterMigrationAlert: FC<FilterMigrationAlertProps> = ({
  filterId,
  onMigrated,
  className
}) => {
  const [validation, setValidation] = useState<FilterValidation | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const baseUrl = getRoutePrefix();

  const loadValidation = useCallback(async () => {
    if (!filterId) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data } = await axios.post(
        `${baseUrl}/filters/${filterId}/validate`
      );

      if (data?.success) {
        setValidation(data.validation as FilterValidation);
        return;
      }

      setValidation(null);
      setErrorMessage(data?.error ?? "Unable to validate filter.");
    } catch (error) {
      setValidation(null);
      setErrorMessage("Unable to validate filter.");
    } finally {
      setLoading(false);
    }
  }, [baseUrl, filterId]);

  useEffect(() => {
    loadValidation();
  }, [loadValidation]);

  const handleMigrate = useCallback(async () => {
    if (!filterId) {
      return;
    }

    setMigrating(true);
    try {
      const { data } = await axios.post(
        `${baseUrl}/filters/${filterId}/migrate`
      );

      if (data?.success) {
        setValidation(data.validation as FilterValidation);
        toast.success("Filter migrated successfully.");
        onMigrated?.();
        return;
      }

      toast.error(data?.error ?? "Filter migration failed.");
    } catch (error) {
      toast.error("Filter migration failed.");
    } finally {
      setMigrating(false);
    }
  }, [baseUrl, filterId, onMigrated]);

  const hasWarnings = useMemo(
    () => (validation?.warnings ?? []).length > 0,
    [validation]
  );

  const hasErrors = useMemo(
    () => validation !== null && !validation.valid,
    [validation]
  );

  const shouldOfferMigration = Boolean(validation?.needsMigration);

  if (!filterId || (loading && !validation && !errorMessage)) {
    return null;
  }

  if (errorMessage) {
    return (
      <div
        className={cn(
          "rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive",
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Filter validation failed</p>
            <p className="text-sm text-destructive/80">{errorMessage}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadValidation}
            disabled={loading}
          >
            {loading ? "Retrying..." : "Retry"}
          </Button>
        </div>
      </div>
    );
  }

  if (hasErrors && validation) {
    return (
      <div
        className={cn(
          "rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5" />
          <div className="space-y-2">
            <p className="font-semibold">Filter has validation errors</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {validation.errors.map((error, index) => (
                <li key={`${error}-${index}`}>{error}</li>
              ))}
            </ul>
            {hasWarnings && (
              <div className="text-sm text-destructive/80">
                Warnings detected. Edit the filter to resolve them.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (hasWarnings && validation) {
    return (
      <div
        className={cn(
          "rounded-md border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900",
          className
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-semibold">Filter needs attention</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-amber-900/90">
                {validation.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
          {shouldOfferMigration && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMigrate}
              disabled={migrating}
            >
              {migrating ? "Migrating..." : "Auto-migrate"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default FilterMigrationAlert;
