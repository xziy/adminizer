/**
 * Column Selector Types
 */

export interface ColumnConfig {
    fieldName: string;
    label: string;
    order: number;
    width?: number;
    isVisible: boolean;
    isEditable?: boolean;
    type?: string;
}

export interface ColumnSelectorProps {
    columns: ColumnConfig[];
    availableFields: FieldDefinition[];
    onChange: (columns: ColumnConfig[]) => void;
    labels?: Partial<ColumnSelectorLabels>;
    maxColumns?: number;
    allowReorder?: boolean;
    allowResize?: boolean;
    allowEdit?: boolean;
}

export interface FieldDefinition {
    name: string;
    label: string;
    type?: string;
    required?: boolean;
}

export interface ColumnSelectorLabels {
    title: string;
    availableColumns: string;
    selectedColumns: string;
    addColumn: string;
    removeColumn: string;
    dragToReorder: string;
    noColumnsSelected: string;
    allColumnsAdded: string;
    visible: string;
    editable: string;
    width: string;
    searchPlaceholder: string;
}

export const defaultColumnSelectorLabels: ColumnSelectorLabels = {
    title: 'Configure Columns',
    availableColumns: 'Available Columns',
    selectedColumns: 'Selected Columns',
    addColumn: 'Add',
    removeColumn: 'Remove',
    dragToReorder: 'Drag to reorder',
    noColumnsSelected: 'No columns selected',
    allColumnsAdded: 'All columns added',
    visible: 'Visible',
    editable: 'Editable',
    width: 'Width',
    searchPlaceholder: 'Search columns...',
};

export const ItemTypes = {
    COLUMN: 'column',
};
