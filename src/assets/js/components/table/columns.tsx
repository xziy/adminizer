"use client"
import {useMemo} from "react";
import {ColumnDef} from "@tanstack/react-table";
import {ArrowDown, ArrowUp, ArrowUpDown} from "lucide-react";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Columns} from "@/types";

export function useTableColumns(columnConfigs: Columns): ColumnDef<any>[] {
    return useMemo(() => {
        return Object.entries(columnConfigs).map(([key, config]) => ({
            accessorKey: key,
            header: ({column}) => {
                const isSorted = column.getIsSorted();
                return (
                    <div className="text-center max-w-[300px]">
                        <Button
                            variant="ghost"
                            className="cursor-pointer"
                            onClick={() => {column.toggleSorting(column.getIsSorted() === "asc")}}
                        >
                            <span className="overflow-hidden text-ellipsis">{config.config.title}</span>
                            <Icon iconNode={!isSorted ? ArrowUpDown : isSorted === "asc" ? ArrowDown : ArrowUp} className="size-3"/>
                        </Button>
                    </div>
                )
            },
            cell: ({row}) => (
                <div className="text-center max-w-[300px] overflow-hidden text-ellipsis">
                    {row.getValue(key)?.toString()}
                </div>
            )
        }));
    }, [columnConfigs]);
}
