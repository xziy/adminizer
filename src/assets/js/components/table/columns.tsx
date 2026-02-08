"use client"
import {useMemo} from "react";
import {ColumnDef} from "@tanstack/react-table";
import {ArrowDown, ArrowUp, ArrowUpDown} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Columns} from "@/types";
import {simpleSanitizeHtml} from "@/lib/utils.ts";
import { InlineEditCell } from "@/components/table/inline-edit-cell";

const DEFAULT_COLUMN_MAX_WIDTH = 300;

const normalizeColumnWidth = (value: unknown): number | undefined => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }
    return Math.round(parsed);
};

type InlineSaveHandler = (
    recordId: string | number,
    fieldName: string,
    value: unknown
) => Promise<unknown>;

export function useTableColumns(
    columnConfigs: Columns,
    onSort?: (key: string, direction: 'asc' | 'desc') => void,
    onColumnSearch?: (key: string, value: string) => void,
    handleSearch?: () => void,
    showSearchInputs?: boolean,
    onInlineSave?: InlineSaveHandler,
    rowIdKey: string = "id"
): ColumnDef<any>[] {
    return useMemo(() => {
        return Object.entries(columnConfigs).map(([key, config]) => ({
            accessorKey: key,
            meta: {
                width: normalizeColumnWidth(config.width)
            },
            header: () => {
                const maxWidth = normalizeColumnWidth(config.width) ?? DEFAULT_COLUMN_MAX_WIDTH;
                return (
                    <div
                        style={{maxWidth}}
                        className={`flex flex-col gap-1 text-center ${config.direction ? 'text-chart-1' : ''}`}>
                        <Button
                            variant="ghost"
                            className="cursor-pointer hover:text-inherit"
                            onClick={() => {
                                if (onSort) {
                                    const direction = config.direction === 'asc' ? 'desc' : 'asc';
                                    onSort(config.data, direction);
                                }
                            }}
                        >
                            <span className="overflow-hidden text-ellipsis">{config.title}</span>
                            {config.direction ?
                                <Icon
                                    iconNode={config.direction === 'asc' ? ArrowUp : ArrowDown}
                                    className="size-3"
                                />
                                :
                                <Icon iconNode={ArrowUpDown} className="size-3"/>
                            }
                        </Button>
                        {showSearchInputs && onColumnSearch && (
                            <input
                                type="text"
                                defaultValue={config.searchColumnValue}
                                className="text-xs p-1 border rounded mb-2 text-foreground"
                                onChange={(e) => {
                                    onColumnSearch(config.data, (e.target as HTMLInputElement).value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && handleSearch) {
                                        handleSearch()
                                    }
                                }}
                            />
                        )}
                    </div>
                )
            },
            cell: ({row}) => {
                const value = row.getValue(key);
                const cleanHtml = simpleSanitizeHtml(value?.toString() ?? '');
                const maxWidth = normalizeColumnWidth(config.width) ?? DEFAULT_COLUMN_MAX_WIDTH;
                const record = row.original as Record<string, unknown> | undefined;
                const recordId = record?.[rowIdKey] as string | number | undefined;
                const inlineEditable = Boolean(config.inlineEditable) && typeof onInlineSave === "function";

                return (
                    <div
                        style={{maxWidth}}
                        className="text-center overflow-hidden text-ellipsis"
                    >
                        {inlineEditable && recordId !== undefined && recordId !== null ? (
                            <InlineEditCell
                                value={value}
                                rowId={recordId}
                                fieldName={key}
                                column={config}
                                onSave={onInlineSave}
                            />
                        ) : (
                            <span dangerouslySetInnerHTML={{ __html: cleanHtml }} />
                        )}
                    </div>
                )
            }
        }));
    }, [columnConfigs, onSort, showSearchInputs, onColumnSearch, onInlineSave, rowIdKey]);
}
