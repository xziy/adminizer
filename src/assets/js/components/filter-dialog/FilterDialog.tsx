import * as React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    FilterIcon,
    ColumnsIcon,
    SettingsIcon,
    Loader2Icon,
    EyeIcon,
    CopyIcon,
} from "lucide-react";
import { FilterBuilder, useFilterBuilder } from "../filter-builder";
import { ColumnSelector, useColumnSelector } from "../column-selector";
import { ColumnConfig } from "../column-selector/types";
import {
    FilterDialogProps,
    FilterDialogFilter,
    FilterDialogLabels,
    FilterVisibility,
    defaultFilterDialogLabels,
    generateSlug,
} from "./types";
import { cn } from "@/lib/utils";

/**
 * FilterDialog - Dialog for creating and editing filters
 *
 * Features:
 * - Tab-based interface (Conditions, Columns, Settings)
 * - Filter conditions via FilterBuilder
 * - Column selection via ColumnSelector
 * - Filter metadata (name, description, visibility)
 * - Optional API access configuration
 *
 * @example
 * ```tsx
 * <FilterDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   modelName="Order"
 *   fields={fields}
 *   availableColumns={columns}
 *   onSave={handleSave}
 * />
 * ```
 */
export function FilterDialog({
    open,
    onOpenChange,
    filter,
    modelName,
    fields,
    availableColumns,
    groups = [],
    onSave,
    onPreview,
    isAdmin = false,
    allowRawSQL = false,
    allowApiAccess = false,
    labels: customLabels,
}: FilterDialogProps) {
    const labels: FilterDialogLabels = useMemo(
        () => ({ ...defaultFilterDialogLabels, ...customLabels }),
        [customLabels]
    );

    const isEditing = !!filter?.id;

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState<FilterVisibility>("private");
    const [sharedGroups, setSharedGroups] = useState<string[]>([]);
    const [slug, setSlug] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [apiEnabled, setApiEnabled] = useState(false);
    const [sortField, setSortField] = useState<string>("");
    const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");

    // Filter builder state
    const {
        conditions,
        setConditions,
        reset: resetConditions,
        getValidConditions,
    } = useFilterBuilder(filter?.conditions || []);

    // Column selector state
    const {
        columns,
        setColumns,
        reset: resetColumns,
    } = useColumnSelector(filter?.columns || []);

    // UI state
    const [activeTab, setActiveTab] = useState("conditions");
    const [isSaving, setIsSaving] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when filter changes
    useEffect(() => {
        if (open) {
            setName(filter?.name || "");
            setDescription(filter?.description || "");
            setVisibility(filter?.visibility || "private");
            setSharedGroups(filter?.sharedGroups || []);
            setSlug(filter?.slug || "");
            setIsPinned(filter?.isPinned || false);
            setApiEnabled(filter?.apiEnabled || false);
            setSortField(filter?.sort?.field || "");
            setSortDirection(filter?.sort?.direction || "DESC");
            setConditions(filter?.conditions || []);
            setColumns(filter?.columns || []);
            setError(null);
            setActiveTab("conditions");
        }
    }, [open, filter, setConditions, setColumns]);

    // Auto-generate slug from name
    const handleNameChange = useCallback((newName: string) => {
        setName(newName);
        if (!isEditing && !slug) {
            // Only auto-generate for new filters if slug is empty
        }
    }, [isEditing, slug]);

    const handleGenerateSlug = useCallback(() => {
        if (name) {
            setSlug(generateSlug(name));
        }
    }, [name]);

    // Copy API key to clipboard
    const handleCopyApiKey = useCallback(() => {
        if (filter?.apiKey) {
            navigator.clipboard.writeText(filter.apiKey);
        }
    }, [filter?.apiKey]);

    // Toggle group selection
    const handleGroupToggle = useCallback((groupId: string) => {
        setSharedGroups((prev) =>
            prev.includes(groupId)
                ? prev.filter((g) => g !== groupId)
                : [...prev, groupId]
        );
    }, []);

    // Build filter object
    const buildFilter = useCallback((): FilterDialogFilter => {
        const validConditions = getValidConditions();
        return {
            id: filter?.id,
            name: name.trim(),
            description: description.trim() || undefined,
            modelName,
            conditions: validConditions,
            columns: columns.length > 0 ? columns : undefined,
            visibility,
            sharedGroups: visibility === "groups" ? sharedGroups : undefined,
            slug: slug.trim() || undefined,
            isPinned,
            isSystemFilter: filter?.isSystemFilter,
            apiEnabled: allowApiAccess ? apiEnabled : undefined,
            apiKey: filter?.apiKey,
            sort: sortField ? { field: sortField, direction: sortDirection } : undefined,
        };
    }, [
        filter?.id,
        filter?.isSystemFilter,
        filter?.apiKey,
        name,
        description,
        modelName,
        getValidConditions,
        columns,
        visibility,
        sharedGroups,
        slug,
        isPinned,
        allowApiAccess,
        apiEnabled,
        sortField,
        sortDirection,
    ]);

    // Validate form
    const validate = useCallback((): boolean => {
        if (!name.trim()) {
            setError(labels.nameRequired);
            setActiveTab("settings");
            return false;
        }
        setError(null);
        return true;
    }, [name, labels.nameRequired]);

    // Handle save
    const handleSave = useCallback(async () => {
        if (!validate()) return;

        setIsSaving(true);
        setError(null);

        try {
            const filterData = buildFilter();
            await onSave(filterData);
            onOpenChange(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save filter");
        } finally {
            setIsSaving(false);
        }
    }, [validate, buildFilter, onSave, onOpenChange]);

    // Handle preview
    const handlePreview = useCallback(async () => {
        if (!onPreview) return;

        setIsPreviewing(true);
        setError(null);

        try {
            const filterData = buildFilter();
            await onPreview(filterData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Preview failed");
        } finally {
            setIsPreviewing(false);
        }
    }, [onPreview, buildFilter]);

    // Sortable fields
    const sortableFields = useMemo(() => {
        return fields.filter((f) => !["json", "text"].includes(f.type));
    }, [fields]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className="max-w-4xl max-h-[90vh] flex flex-col"
                onInteractOutside={(e) => {
                    // Предотвращаем закрытие диалога при клике вне области
                    e.preventDefault();
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? labels.titleEdit : labels.title}
                        {modelName && (
                            <Badge variant="secondary" className="ml-2">
                                {modelName}
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1 flex flex-col min-h-0"
                >
                    <TabsList className="w-full justify-start">
                        <TabsTrigger value="conditions" className="gap-1.5">
                            <FilterIcon className="size-4" />
                            {labels.tabConditions}
                        </TabsTrigger>
                        <TabsTrigger value="columns" className="gap-1.5">
                            <ColumnsIcon className="size-4" />
                            {labels.tabColumns}
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-1.5">
                            <SettingsIcon className="size-4" />
                            {labels.tabSettings}
                        </TabsTrigger>
                    </TabsList>

                    {/* Conditions Tab */}
                    <TabsContent value="conditions" className="flex-1 min-h-0 mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <FilterBuilder
                                conditions={conditions}
                                fields={fields}
                                onChange={setConditions}
                                maxDepth={5}
                                allowRawSQL={allowRawSQL && isAdmin}
                                isAdmin={isAdmin}
                            />
                        </ScrollArea>
                    </TabsContent>

                    {/* Columns Tab */}
                    <TabsContent value="columns" className="flex-1 min-h-0 mt-4">
                        <ColumnSelector
                            columns={columns}
                            availableFields={availableColumns}
                            onChange={setColumns}
                            allowReorder={true}
                            allowResize={true}
                            allowEdit={true}
                        />
                    </TabsContent>

                    {/* Settings Tab */}
                    <TabsContent value="settings" className="flex-1 min-h-0 mt-4">
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="filter-name">{labels.nameLabel}</Label>
                                    <Input
                                        id="filter-name"
                                        value={name}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        placeholder={labels.namePlaceholder}
                                        className={cn(error && !name.trim() && "border-destructive")}
                                    />
                                    {error && !name.trim() && (
                                        <p className="text-sm text-destructive">{error}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="filter-description">{labels.descriptionLabel}</Label>
                                    <Textarea
                                        id="filter-description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder={labels.descriptionPlaceholder}
                                        rows={3}
                                    />
                                </div>

                                {/* Visibility */}
                                <div className="space-y-2">
                                    <Label>{labels.visibilityLabel}</Label>
                                    <Select
                                        value={visibility}
                                        onValueChange={(v) => setVisibility(v as FilterVisibility)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="private">
                                                {labels.visibilityPrivate}
                                            </SelectItem>
                                            <SelectItem value="public">
                                                {labels.visibilityPublic}
                                            </SelectItem>
                                            {groups.length > 0 && (
                                                <SelectItem value="groups">
                                                    {labels.visibilityGroups}
                                                </SelectItem>
                                            )}
                                            {isAdmin && (
                                                <SelectItem value="system">
                                                    {labels.visibilitySystem}
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Shared Groups */}
                                {visibility === "groups" && groups.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>{labels.sharedGroupsLabel}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {groups.map((group) => (
                                                <Badge
                                                    key={group.id}
                                                    variant={
                                                        sharedGroups.includes(group.id)
                                                            ? "default"
                                                            : "outline"
                                                    }
                                                    className="cursor-pointer"
                                                    onClick={() => handleGroupToggle(group.id)}
                                                >
                                                    {group.name}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Slug */}
                                <div className="space-y-2">
                                    <Label htmlFor="filter-slug">{labels.slugLabel}</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="filter-slug"
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            placeholder={labels.slugPlaceholder}
                                            className="flex-1"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateSlug}
                                            disabled={!name}
                                        >
                                            Generate
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {labels.slugHelp}
                                    </p>
                                </div>

                                {/* Default Sort */}
                                <div className="space-y-2">
                                    <Label>{labels.sortLabel}</Label>
                                    <div className="flex gap-2">
                                        <Select
                                            value={sortField || "__none__"}
                                            onValueChange={(v) => setSortField(v === "__none__" ? "" : v)}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue placeholder={labels.noSort} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">
                                                    {labels.noSort}
                                                </SelectItem>
                                                {sortableFields.map((field) => (
                                                    <SelectItem key={field.name} value={field.name}>
                                                        {field.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {sortField && (
                                            <Select
                                                value={sortDirection}
                                                onValueChange={(v) => setSortDirection(v as "ASC" | "DESC")}
                                            >
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ASC">{labels.sortAsc}</SelectItem>
                                                    <SelectItem value="DESC">{labels.sortDesc}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>

                                {/* Pin to sidebar */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="filter-pinned">{labels.pinnedLabel}</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {labels.pinnedHelp}
                                        </p>
                                    </div>
                                    <Switch
                                        id="filter-pinned"
                                        checked={isPinned}
                                        onCheckedChange={setIsPinned}
                                    />
                                </div>

                                {/* API Access */}
                                {allowApiAccess && (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="filter-api">{labels.apiEnabledLabel}</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    {labels.apiEnabledHelp}
                                                </p>
                                            </div>
                                            <Switch
                                                id="filter-api"
                                                checked={apiEnabled}
                                                onCheckedChange={setApiEnabled}
                                            />
                                        </div>

                                        {/* API Key (read-only, for existing filters) */}
                                        {apiEnabled && filter?.apiKey && (
                                            <div className="space-y-2">
                                                <Label>{labels.apiKeyLabel}</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={filter.apiKey}
                                                        readOnly
                                                        className="flex-1 font-mono text-sm"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={handleCopyApiKey}
                                                    >
                                                        <CopyIcon className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>

                {/* Error display */}
                {error && name.trim() && (
                    <p className="text-sm text-destructive">{error}</p>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        {labels.cancel}
                    </Button>
                    {onPreview && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePreview}
                            disabled={isSaving || isPreviewing}
                        >
                            {isPreviewing ? (
                                <Loader2Icon className="size-4 animate-spin mr-2" />
                            ) : (
                                <EyeIcon className="size-4 mr-2" />
                            )}
                            {labels.preview}
                        </Button>
                    )}
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || isPreviewing}
                    >
                        {isSaving && <Loader2Icon className="size-4 animate-spin mr-2" />}
                        {labels.save}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Hook for managing filter dialog state
 */
export function useFilterDialog() {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState<FilterDialogFilter | null>(null);

    const openCreate = useCallback(() => {
        setFilter(null);
        setOpen(true);
    }, []);

    const openEdit = useCallback((filterToEdit: FilterDialogFilter) => {
        setFilter(filterToEdit);
        setOpen(true);
    }, []);

    const close = useCallback(() => {
        setOpen(false);
        setFilter(null);
    }, []);

    return {
        open,
        setOpen,
        filter,
        openCreate,
        openEdit,
        close,
    };
}

export default FilterDialog;
