import {type Columns, SharedData} from '@/types';
import {useTableColumns} from "@/components/table/columns"
import {DataTable} from "@/components/table/data-table"
import {Link, router, usePage} from "@inertiajs/react";
import {ColumnDef} from "@tanstack/react-table";
import {Button} from "@/components/ui/button.tsx";
import {BetweenHorizontalStart, Download, Eye, Pencil, SquarePlus, Search, RefreshCcw} from "lucide-react";
import {Icon} from "@/components/icon.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {DropdownMenu} from "@radix-ui/react-dropdown-menu";
import {
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import { Checkbox } from "@/components/ui/checkbox";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {toast} from "sonner";
import {Toaster} from "@/components/ui/sonner"
import DeleteModal from "@/components/modals/del-modal.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {generatePagination} from "@/lib/pagination.ts";
import PaginationRender from "@/components/pagination-render.tsx";
import FilterMigrationAlert from "@/components/filter-migration-alert";
import ColumnSelector, { type ColumnConfig, type ColumnFieldInfo } from "@/components/column-selector";
import FilterQuickLinksToggle from "@/components/filter-quick-links-toggle";
import FilterFavoriteToggle from "@/components/filter-favorite-toggle";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import axios from "axios";

interface Action {
    id: string,
    title: string,
    icon: string,
    type: 'blank' | 'self',
    link: string
}

interface ExtendedSharedData extends SharedData {
    data: {
        data: any[],
        recordsTotal: number
        recordsFiltered: number
    }
    columns: Columns,
    identifierField?: string,
    filtersEnabled?: boolean,
    useLegacySearch?: boolean,
    appliedFilter?: string,
    appliedFilterId?: string,
    appliedFilterName?: string,
    appliedFilterPinned?: boolean,
    filterColumnFields?: ColumnFieldInfo[],
    filterColumns?: ColumnConfig[],
    filterSelectedFields?: string[],
    header: {
        actions: Action[],
        inlineActions: Action[],
        thActionsTitle: string
        crudActions: {
            createTitle: string;
            editTitle: string;
            viewsTitle: string;
            deleteTitle: string;
        },
        entity: {
            name: string;
            uri: string
        },
        notFoundContent: string,
        searchBtn: string,
        resetBtn: string
        delModal: {
            yes: string,
            no: string
            text: string
        }
    }
}

const ListTable = () => {
    const page = usePage<ExtendedSharedData>()
    const data = page.props.data
    const rowIdKey = page.props.identifierField ?? "id"
    const appliedFilterId = page.props.appliedFilterId
    const availableColumnFields = page.props.filterColumnFields ?? []
    const savedFilterColumns = page.props.filterColumns ?? []
    const savedFilterSelectedFields = page.props.filterSelectedFields ?? []
    const appliedFilterName = page.props.appliedFilterName
    const appliedFilterPinned = page.props.appliedFilterPinned
    const [loading, setLoading] = useState(false)
    const [columnDialogOpen, setColumnDialogOpen] = useState(false)
    const [columnSaving, setColumnSaving] = useState(false)
    const [columnDraft, setColumnDraft] = useState<ColumnConfig[]>([])
    const [limitFieldsEnabled, setLimitFieldsEnabled] = useState(false)
    const [tableRows, setTableRows] = useState<any[]>(data.data ?? [])
    const [exporting, setExporting] = useState(false)
    const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json">("csv")
    // Состояния для параметров
    const [searchValue, setSearchValue] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [count, setCount] = useState('5')
    const [sortColumn, setSortColumn] = useState('1')
    const [sortDirection, setSortDirection] = useState('desc')

    // Ref для хранения параметров поиска по колонкам
    const queryColumnsRef = useRef<{ key: string, value: string }[]>([])

    // Инициализация состояний из URL при загрузке
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        console.log(page.props)
        setSearchValue(searchParams.get('globalSearch') || '')
        setShowSearch(!!searchParams.get('globalSearch'))
        setCurrentPage(parseInt(searchParams.get('page') || '1'))
        setCount(searchParams.get('count') || '5')
        setSortColumn(searchParams.get('column') || '1')
        setSortDirection(searchParams.get('direction') || 'desc')

        // Инициализация queryColumnsRef из URL
        const searchColumns = searchParams.getAll('searchColumn')
        const searchValues = searchParams.getAll('searchColumnValue')
        queryColumnsRef.current = searchColumns.map((col, i) => ({
            key: col,
            value: searchValues[i]
        }))
    }, [])

    useEffect(() => {
        // fix menu after deletion and redirect
        document.body.removeAttribute('style')
    }, [data])

    useEffect(() => {
        setTableRows(data.data ?? [])
    }, [data.data])


    const pagination = useMemo(() => {
        return generatePagination(
            data.recordsFiltered,
            parseInt(count),
            currentPage,
            5
        )
    }, [data.recordsFiltered, count, currentPage, searchValue])

    const defaultColumns = useMemo<ColumnConfig[]>(() => {
        if (savedFilterColumns.length > 0) {
            return savedFilterColumns;
        }
        return Object.entries(page.props.columns ?? {}).map(([fieldName, config], index) => ({
            fieldName,
            order: index,
            isVisible: true,
            isEditable: false,
            width: typeof config?.width === "number" ? config.width : undefined
        }));
    }, [page.props.columns, savedFilterColumns])

    useEffect(() => {
        if (!columnDialogOpen) {
            return;
        }
        setColumnDraft(defaultColumns);
        setLimitFieldsEnabled(savedFilterSelectedFields.length > 0);
    }, [columnDialogOpen, defaultColumns, savedFilterSelectedFields.length])

    useEffect(() => {
        if (page.props.flash) {
            if (page.props.flash.success) {
                toast.success(page.props.flash.success)
            }
            if (page.props.flash.error) {
                toast.error(page.props.flash.error)
            }
        }
    }, [page.props.flash])

    const changeCount = useCallback((newCount: string) => {
        setCount(newCount)
        setCurrentPage(1)
        setLoading(true)
        router.visit(`${page.props.header.entity.uri}?count=${newCount}&page=1`, {
            preserveState: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }, [data])

    const buildQueryString = useCallback(
        (pageOverride?: number, initSortDirection?: string, initSortColumn?: string, initSearchValue?: string) => {
            const pageToUse = pageOverride !== undefined ? pageOverride : currentPage
            const initSortDir = initSortDirection !== undefined ? initSortDirection : sortDirection
            const initSortCol = initSortColumn !== undefined ? initSortColumn : sortColumn
            const initSearchVal = initSearchValue !== undefined ? initSearchValue : searchValue

            const baseParams = `count=${count}&page=${pageToUse}&column=${initSortCol}&direction=${initSortDir}`
            const searchParam = initSearchVal ? `&globalSearch=${initSearchVal}` : ''
            const columnParams = queryColumnsRef.current
                .map(item => `&searchColumn=${item.key}&searchColumnValue=${item.value}`)
                .join('')

            return `${baseParams}${searchParam}${columnParams}`
        }, [data, count, currentPage, sortColumn, sortDirection, searchValue])

    const handlePageChange = useCallback((value: number) => {
        setCurrentPage(value)
        setLoading(true)
        router.visit(`${page.props.header.entity.uri}?${buildQueryString(value)}`, {
            preserveState: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }, [buildQueryString, page.props.header.entity.uri])

    const handleCustomSort = useCallback((column: string, sortDirection: string) => {
        setSortColumn(column)
        setSortDirection(sortDirection)
        setLoading(true)
        router.visit(`${page.props.header.entity.uri}?${buildQueryString(undefined, sortDirection, column)}`, {
            preserveState: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }, [count, currentPage, searchValue])

    const handleGlobalSearch = useCallback((value: string) => {
        setSearchValue(value)
        setCurrentPage(1)
    }, [])

    const handleSearch = useCallback(() => {
        setLoading(true)
        router.visit(`${page.props.header.entity.uri}?${buildQueryString(1)}`, {
            preserveState: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }, [page.props.header.entity.uri, buildQueryString])

    const handleColumnSearch = useCallback((key: string, value: string) => {
        setCurrentPage(1)
        const existingIndex = queryColumnsRef.current.findIndex(item => item.key === key)
        if (existingIndex >= 0) {
            queryColumnsRef.current.splice(existingIndex, 1)
        }
        if (value) {
            queryColumnsRef.current.push({key, value})
        }
    }, [data])

    const resetForm = () => {
        setShowSearch(false)
        setSearchValue('')
        queryColumnsRef.current = []
        setCurrentPage(1)
        setSortColumn('1')
        setSortDirection('desc')

        router.visit(`${page.props.header.entity.uri}?count=${count}&page=1`, {
            preserveState: true,
            preserveScroll: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }

    const handleInlineSave = useCallback(
        async (recordId: string | number, fieldName: string, value: unknown) => {
            const endpoint = `${page.props.header.entity.uri}/${recordId}/field/${fieldName}`;
            const response = await axios.patch(endpoint, { value });
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Failed to save");
            }
            const updatedValue =
                response.data?.data?.[fieldName] !== undefined
                    ? response.data?.data?.[fieldName]
                    : value;
            setTableRows((current) =>
                current.map((row) =>
                    row?.[rowIdKey] === recordId ? { ...row, [fieldName]: updatedValue } : row
                )
            );
            return updatedValue;
        },
        [page.props.header.entity.uri, rowIdKey]
    );

    const dynamicColumns = useTableColumns(
        page.props.columns,
        handleCustomSort,
        handleColumnSearch,
        handleSearch,
        showSearch,
        handleInlineSave,
        rowIdKey
    );

    const tableColumns = useMemo(() => {
        const baseColumns: ColumnDef<any>[] = [
            {
                accessorKey: 'actions',
                header: () => (
                    <div className="text-center">
                        {page.props.header.thActionsTitle}
                    </div>
                ),
                cell: ({row}) => {
                    return (
                        <div className="text-center">
                            {(['deleteTitle', 'viewsTitle', 'editTitle'] as const).some(key =>
                                    page.props.header.crudActions?.[key] && page.props.header.crudActions?.[key].trim() !== ''
                                ) &&
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild className="cursor-pointer">
                                        <Button variant="outline" size="icon">
                                            <BetweenHorizontalStart/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-46" side="right" align="start">
                                        <DropdownMenuGroup>
                                            {page.props.header.crudActions?.editTitle && (
                                                <DropdownMenuItem asChild className="cursor-pointer">
                                                    <Link
                                                        href={`${page.props.header.entity.uri}/edit/${row.original.id}`}
                                                        onClick={() => {
                                                            localStorage.setItem('backUrl', window.location.pathname + window.location.search)
                                                        }}>
                                                        <Icon iconNode={Pencil}/>
                                                        {page.props.header.crudActions.editTitle}
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            {page.props.header.crudActions?.viewsTitle && (
                                                <DropdownMenuItem asChild className="cursor-pointer">
                                                    <Link
                                                        href={`${page.props.header.entity.uri}/view/${row.original.id}`}>
                                                        <Icon iconNode={Eye}/>
                                                        {page.props.header.crudActions.viewsTitle}
                                                    </Link>
                                                </DropdownMenuItem>
                                            )}
                                            {page.props.header.crudActions?.deleteTitle && (
                                                <DropdownMenuItem asChild className="cursor-pointer">
                                                    <DeleteModal btnTitle={page.props.header.crudActions.deleteTitle}
                                                                 delModal={page.props.header.delModal}
                                                                 btnCLass="font-normal text-destructive hover:text-destructive w-full cursor-pointer justify-start"
                                                                 link={`${page.props.header.entity.uri}/remove/${row.original.id}?referTo=${encodeURIComponent(window.location.search)}`}/>
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuGroup>
                                        {page.props.header.inlineActions && page.props.header.inlineActions.length > 0 && (
                                            <>
                                                <DropdownMenuSeparator/>
                                                {page.props.header.inlineActions.map((action: Action) => (
                                                    <DropdownMenuItem
                                                        key={action.id}
                                                        asChild
                                                        className="cursor-pointer"
                                                    >
                                                        {action.type === 'blank' ? (
                                                            <a target="_blank"
                                                               href={action.link}
                                                            >
                                                                {action.icon && <MaterialIcon name={action.icon}
                                                                                              className="!text-[18px] mr-2"/>}
                                                                <span>{action.title}</span>
                                                            </a>
                                                        ) : (
                                                            <Link
                                                                href={`${action.link}/${row.original.id}?id=${row.original.id}&entity=${page.props.header.entity.name}`}
                                                            >
                                                                {action.icon && <MaterialIcon name={action.icon}
                                                                                              className="!text-[18px] mr-2"/>}
                                                                <span>{action.title}</span>
                                                            </Link>
                                                        )}

                                                    </DropdownMenuItem>
                                                ))}
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            }
                        </div>
                    )
                }
            }
        ]
        return [...baseColumns, ...dynamicColumns];
    }, [
        page.props.header.thActionsTitle,
        page.props.header.crudActions,
        page.props.header.inlineActions,
        page.props.header.entity.uri,
        page.props.header.entity.name,
        page.props.header.delModal,
        dynamicColumns
    ]);

    const handleExport = useCallback(async () => {
        setExporting(true)
        try {
            const query = window.location.search || ""
            const endpoint = `${window.routePrefix}/export${query}`
            const payload = {
                format: exportFormat,
                modelName: page.props.header.entity.name,
                filterId: appliedFilterId ?? undefined
            }
            const response = await axios.post(endpoint, payload)
            if (!response.data?.success) {
                throw new Error(response.data?.error || "Export failed")
            }
            const downloadUrl = response.data?.downloadUrl
            if (downloadUrl) {
                window.open(downloadUrl, "_blank")
                toast.success("Export ready")
            } else {
                toast.error("Export failed")
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Export failed"
            toast.error(message)
        } finally {
            setExporting(false)
        }
    }, [exportFormat, page.props.header.entity.name, appliedFilterId])

    const handleSaveColumns = useCallback(async () => {
        if (!appliedFilterId) {
            return;
        }

        setColumnSaving(true)
        try {
            const selectedFields = limitFieldsEnabled
                ? Array.from(
                    new Set(
                        columnDraft
                            .filter((column) => column.isVisible !== false)
                            .map((column) => column.fieldName)
                    )
                )
                : [];
            const res = await axios.patch(`${window.routePrefix}/filters/${appliedFilterId}`, {
                columns: columnDraft,
                selectedFields
            })
            if (res.data?.success) {
                toast.success("Column layout saved")
                setColumnDialogOpen(false)
                router.visit(`${window.location.pathname}${window.location.search}`, {
                    preserveState: true,
                    only: ['data', 'columns', 'header']
                })
            } else {
                toast.error(res.data?.error || "Failed to save columns")
            }
        } catch (error) {
            toast.error("Failed to save columns")
        } finally {
            setColumnSaving(false)
        }
    }, [appliedFilterId, columnDraft, limitFieldsEnabled])

    return (
        <>
            <Toaster position="top-center" richColors closeButton/>
            <div className={`flex h-auto flex-1 flex-col gap-4 rounded-xl p-4 ${loading ? 'opacity-50' : ''}`}>
                <div className="flex gap-2 sticky top-0 z-10 bg-background py-3">
                    {page.props.header.crudActions?.createTitle && (
                        <Button asChild>
                            <Link href={`${page.props.header.entity.uri}/add`}>
                                <Icon iconNode={SquarePlus}/>
                                {page.props.header.crudActions.createTitle}
                            </Link>
                        </Button>
                    )}
                    <Button
                        className="transition-none cursor-pointer"
                        variant={showSearch ? "destructive" : "outline"}
                        onClick={() => {
                            showSearch ? resetForm() : setShowSearch(true)
                        }}
                    >
                        <Icon iconNode={showSearch ? RefreshCcw : Search}/>
                        {showSearch ? page.props.header.resetBtn : page.props.header.searchBtn}
                    </Button>
                    {page.props.filtersEnabled && appliedFilterId && (
                        <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline">Columns</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>Customize Columns</DialogTitle>
                                    <DialogDescription>
                                        Choose which columns to display for this filter and reorder them.
                                    </DialogDescription>
                                </DialogHeader>
                                <ColumnSelector
                                    availableFields={availableColumnFields}
                                    selectedColumns={columnDraft}
                                    onChange={setColumnDraft}
                                />
                                <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3 text-sm">
                                    <Checkbox
                                        id="limit-selected-fields"
                                        checked={limitFieldsEnabled}
                                        onCheckedChange={(value) => setLimitFieldsEnabled(Boolean(value))}
                                    />
                                    <div className="grid gap-1">
                                        <label htmlFor="limit-selected-fields" className="font-medium">
                                            Limit data to visible columns
                                        </label>
                                        <p className="text-xs text-muted-foreground">
                                            Only the visible columns will be fetched when this filter is applied.
                                        </p>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button
                                        variant="outline"
                                        onClick={() => setColumnDialogOpen(false)}
                                        disabled={columnSaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSaveColumns} disabled={columnSaving}>
                                        {columnSaving ? "Saving..." : "Save columns"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                    // Offer quick-link pinning when a saved filter is applied.
                    // Offer quick-link pinning when a saved filter is applied.
                    {page.props.filtersEnabled && appliedFilterId && (
                        <FilterQuickLinksToggle
                            filterId={appliedFilterId}
                            filterName={appliedFilterName}
                        />
                    )}
                    // Allow users to mark the active filter as a favorite.
                    {page.props.filtersEnabled && appliedFilterId && (
                        <FilterFavoriteToggle
                            filterId={appliedFilterId}
                            isPinned={appliedFilterPinned}
                        />
                    )}
                    <div className="flex items-center gap-2">
                        <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as "csv" | "xlsx" | "json")}>
                            <SelectTrigger className="w-[110px]">
                                <SelectValue placeholder={exportFormat}/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="csv">CSV</SelectItem>
                                <SelectItem value="xlsx">Excel</SelectItem>
                                <SelectItem value="json">JSON</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={handleExport} disabled={exporting}>
                            <Icon iconNode={Download}/>
                            {exporting ? "Exporting..." : "Export"}
                        </Button>
                    </div>
                    {page.props.header.actions.length > 0 && (
                        <>
                            <div className="gap-2 ml-6 hidden lg:flex">
                                {page.props.header.actions.map((action) => (
                                    <Button asChild variant="outline" key={action.id}>
                                        {action.type === 'blank' ? (
                                            <a href={action.link} target='_blank'>
                                                {action.icon &&
                                                    <MaterialIcon name={action.icon} className="!text-[18px]"/>}
                                                {action.title}
                                            </a>
                                        ) : (
                                            <Link href={action.link}>
                                                {action.icon &&
                                                    <MaterialIcon name={action.icon} className="!text-[18px]"/>}
                                                {action.title}
                                            </Link>
                                        )}
                                    </Button>
                                )) || null}
                            </div>
                            <div className="block lg:hidden ml-6">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="icon">
                                            <BetweenHorizontalStart/>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-fit" side="right" align="start">
                                        <DropdownMenuGroup className="grid gap-2">
                                            {page.props.header.actions.map((action) => (
                                                <Button asChild variant="outline" key={action.id}>
                                                    <a href={action.link} target='_blank'>
                                                        <MaterialIcon name={action.icon} className="!text-[18px]"/>
                                                        {action.title}
                                                    </a>
                                                </Button>
                                            )) || null}
                                        </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </>
                    )}
                </div>
                {page.props.filtersEnabled && appliedFilterId && (
                    <FilterMigrationAlert
                        filterId={appliedFilterId}
                        onMigrated={() => {
                            router.visit(`${window.location.pathname}${window.location.search}`, {
                                preserveState: true,
                                only: ['data', 'columns', 'header']
                            })
                        }}
                    />
                )}
                <DataTable
                    columns={tableColumns}
                    data={tableRows}
                    searchValue={searchValue}
                    searchTxt={page.props.header.searchBtn}
                    notFoundContent={page.props.header.notFoundContent}
                    // key={new Date().getTime()}
                    globalSearch={showSearch}
                    onGlobalSearch={handleGlobalSearch}
                    handleSearch={handleSearch}
                />
                <div className="mt-4 flex flex-wrap justify-center md:justify-between gap-4 items-end">
                    <div
                        className="grid grid-cols-2 md:grid-cols-1 gap-4 items-center justify-items-center md:justify-items-normal">
                        <p className="text-sm text-foreground/70">Show {pagination.from} - {pagination.to} of {pagination.total}</p>
                        <div className="max-w-fit">
                            <Select onValueChange={(value) => changeCount(value)}
                                    value={count}>
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder={count}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {['5', '10', '50'].map((option) => (
                                        <SelectItem value={option}
                                                    key={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        {data.data.length > 0 && <PaginationRender pagination={pagination} pageChange={handlePageChange}
                                                                   currentPage={currentPage}/>}
                    </div>
                </div>
            </div>
        </>
    );
}
export default ListTable
