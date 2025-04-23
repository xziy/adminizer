"use client"
import {useMemo} from "react";
import {ColumnDef} from "@tanstack/react-table";
import {ArrowDown, ArrowUp, ArrowUpDown} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Columns} from "@/types";

export function useTableColumns(
    columnConfigs: Columns,
    onSort?: (key: string, direction: 'asc' | 'desc') => void,
    onColumnSearch?: (key: string, value: string) => void,
    handleSearch?: () => void,
    showSearchInputs?: boolean
): ColumnDef<any>[] {
    return useMemo(() => {
        return Object.entries(columnConfigs).map(([key, config]) => ({
            accessorKey: key,
            header: () => {
                return (
                    <div
                        className={`flex flex-col gap-1 text-center max-w-[300px] ${config.direction ? 'text-ring' : ''}`}>
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
                                placeholder={`Search ${config.title}`}
                                className="text-xs p-1 border rounded mb-2 text-foreground"
                                onChange={(e) => {onColumnSearch(config.data, (e.target as HTMLInputElement).value);}}
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
            cell: ({row}) => (
                <div className="text-center max-w-[300px] overflow-hidden text-ellipsis">
                    {row.getValue(key)?.toString()}
                </div>
            )
        }));
    }, [columnConfigs, onSort, showSearchInputs, onColumnSearch]);
}
