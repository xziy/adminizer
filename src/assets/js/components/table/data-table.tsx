import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {Input} from "@/components/ui/input.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {Search} from "lucide-react";
import { useRef, useEffect } from 'react';

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[],
    notFoundContent: string,
    globalSearch?: boolean,
    searchValue?: string
    onGlobalSearch?: (value: string) => void
    handleSearch?: () => void
    searchTxt?: string
}

const resolveColumnWidth = (value: unknown): number | undefined => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return undefined;
    }
    return Math.round(parsed);
};

export function DataTable<TData, TValue>(
    {
        columns,
        data,
        notFoundContent,
        globalSearch = false,
        onGlobalSearch,
        searchValue,
        handleSearch,
        searchTxt
    }: DataTableProps<TData, TValue>) {

    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (globalSearch && inputRef.current) {
            inputRef.current.focus();
        }
    });

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableSorting: false,
        manualPagination: true,
    })
    return (
        <div className="rounded-md border">
            {globalSearch && onGlobalSearch && (
                <div className="flex gap-2 p-2">
                    <Input
                        ref={inputRef}
                        type="text"
                        value={searchValue}
                        placeholder={searchTxt}
                        className="w-full max-w-[200px] p-2 border rounded"
                        onChange={(e) => {
                            onGlobalSearch(e.target.value)
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && handleSearch) {
                                handleSearch()
                            }
                        }}
                    />
                    <Button variant="outline" size="icon" onClick={handleSearch}>
                        <Icon iconNode={Search} className="size-5"/>
                    </Button>
                </div>
            )}
            <Table wrapperHeight="max-h-[65vh]">
                <TableHeader className="sticky top-0 z-10 bg-background shadow">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => {
                                const width = resolveColumnWidth(
                                    (header.column.columnDef.meta as { width?: number } | undefined)?.width
                                );
                                return (
                                    <TableHead
                                        key={header.id}
                                        style={
                                            width
                                                ? { width, minWidth: width, maxWidth: width }
                                                : undefined
                                        }
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                    </TableHead>
                                )
                            })}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows?.length ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                data-state={row.getIsSelected() && "selected"}
                            >
                                {row.getVisibleCells().map((cell) => {
                                    const width = resolveColumnWidth(
                                        (cell.column.columnDef.meta as { width?: number } | undefined)?.width
                                    );
                                    return (
                                        <TableCell
                                            key={cell.id}
                                            style={
                                                width
                                                    ? { width, minWidth: width, maxWidth: width }
                                                    : undefined
                                            }
                                            className={cell.column.getIndex() === 0 ? "sticky left-0 bg-background" : ""}
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                {notFoundContent}
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
