"use client"
import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table"
import {Columns} from "@/types";

export function useTableColumns(initColumns: Columns): ColumnDef<any>[] {
    return useMemo(() => {
        return Object.keys(initColumns).map((key) => {
            const column = initColumns[key];
            return {
                accessorKey: key,
                header: () => (
                    <div className="text-center max-w-[300px]">
                        {column.config.title}
                    </div>
                ),
                cell: ({row}) => {
                    return <div className="text-center max-w-[300px] overflow-hidden text-ellipsis">{row.getValue(key)?.toString()}</div>
                }
            } as ColumnDef<any>;
        });
    }, [initColumns]);
}
