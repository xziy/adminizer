/**
 * Filter Dialog Types
 */

import { FilterCondition, FieldConfig } from "../filter-builder/types";
import { ColumnConfig, FieldDefinition } from "../column-selector/types";

export type FilterVisibility = 'private' | 'public' | 'groups' | 'system';

export interface FilterDialogFilter {
    id?: string;
    name: string;
    description?: string;
    modelName: string;
    conditions: FilterCondition[];
    columns?: ColumnConfig[];
    selectedFields?: string[];
    visibility: FilterVisibility;
    sharedGroups?: string[];
    slug?: string;
    isPinned?: boolean;
    isSystemFilter?: boolean;
    apiEnabled?: boolean;
    apiKey?: string;
    sort?: {
        field: string;
        direction: 'ASC' | 'DESC';
    };
}

export interface FilterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    filter?: FilterDialogFilter | null;
    modelName: string;
    fields: FieldConfig[];
    availableColumns: FieldDefinition[];
    groups?: GroupOption[];
    onSave: (filter: FilterDialogFilter) => Promise<void>;
    onPreview?: (filter: FilterDialogFilter) => Promise<void>;
    isAdmin?: boolean;
    allowRawSQL?: boolean;
    allowApiAccess?: boolean;
    labels?: Partial<FilterDialogLabels>;
}

export interface GroupOption {
    id: string;
    name: string;
}

export interface FilterDialogLabels {
    title: string;
    titleEdit: string;
    tabConditions: string;
    tabColumns: string;
    tabSettings: string;
    nameLabel: string;
    namePlaceholder: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    visibilityLabel: string;
    visibilityPrivate: string;
    visibilityPublic: string;
    visibilityGroups: string;
    visibilitySystem: string;
    sharedGroupsLabel: string;
    sharedGroupsPlaceholder: string;
    slugLabel: string;
    slugPlaceholder: string;
    slugHelp: string;
    pinnedLabel: string;
    pinnedHelp: string;
    apiEnabledLabel: string;
    apiEnabledHelp: string;
    apiKeyLabel: string;
    sortLabel: string;
    sortFieldLabel: string;
    sortDirectionLabel: string;
    sortAsc: string;
    sortDesc: string;
    noSort: string;
    selectedFieldsLabel: string;
    selectedFieldsPlaceholder: string;
    selectedFieldsHelp: string;
    selectedFieldsSearch: string;
    selectedFieldsEmpty: string;
    save: string;
    cancel: string;
    preview: string;
    nameRequired: string;
}

export const defaultFilterDialogLabels: FilterDialogLabels = {
    title: 'Create Filter',
    titleEdit: 'Edit Filter',
    tabConditions: 'Conditions',
    tabColumns: 'Columns',
    tabSettings: 'Settings',
    nameLabel: 'Filter Name',
    namePlaceholder: 'Enter filter name...',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Optional description...',
    visibilityLabel: 'Visibility',
    visibilityPrivate: 'Private (only me)',
    visibilityPublic: 'Public (all users)',
    visibilityGroups: 'Specific groups',
    visibilitySystem: 'System filter',
    sharedGroupsLabel: 'Share with groups',
    sharedGroupsPlaceholder: 'Select groups...',
    slugLabel: 'URL Slug',
    slugPlaceholder: 'my-filter-name',
    slugHelp: 'Optional URL-friendly identifier for direct links',
    pinnedLabel: 'Pin to sidebar',
    pinnedHelp: 'Show this filter in the quick links section',
    apiEnabledLabel: 'Enable API access',
    apiEnabledHelp: 'Allow external access via JSON/Atom feed',
    apiKeyLabel: 'API Key',
    sortLabel: 'Default Sort',
    sortFieldLabel: 'Sort by',
    sortDirectionLabel: 'Direction',
    sortAsc: 'Ascending',
    sortDesc: 'Descending',
    noSort: 'No default sort',
    selectedFieldsLabel: 'Fields to load',
    selectedFieldsPlaceholder: 'Select fields...',
    selectedFieldsHelp: 'Leave empty to load all fields',
    selectedFieldsSearch: 'Search fields...',
    selectedFieldsEmpty: 'No fields found',
    save: 'Save Filter',
    cancel: 'Cancel',
    preview: 'Preview',
    nameRequired: 'Filter name is required',
};

export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50);
}
