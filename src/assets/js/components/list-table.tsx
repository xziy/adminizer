import {type Columns, SharedData} from '@/types';
import {useTableColumns} from "@/components/table/columns"
import {DataTable} from "@/components/table/data-table"
import {Link, router, usePage} from "@inertiajs/react";
import {ColumnDef} from "@tanstack/react-table";
import {Button} from "@/components/ui/button.tsx";
import {BetweenHorizontalStart, Eye, Pencil, SquarePlus, Search, RefreshCcw, Filter} from "lucide-react";
import {Icon} from "@/components/icon.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {DropdownMenu} from "@radix-ui/react-dropdown-menu";
import {
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {toast} from "sonner";
import {Toaster} from "@/components/ui/sonner"
import DeleteModal from "@/components/modals/del-modal.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {generatePagination} from "@/lib/pagination.ts";
import PaginationRender from "@/components/pagination-render.tsx";
import {FilterSidebar} from "@/components/filter-sidebar";
import {SavedFilter} from "@/components/filter-sidebar/types";
import {FilterDialog} from "@/components/filter-dialog";

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
    const [loading, setLoading] = useState(false)
    // Состояния для параметров
    const [searchValue, setSearchValue] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [count, setCount] = useState('5')
    const [sortColumn, setSortColumn] = useState('1')
    const [sortDirection, setSortDirection] = useState('desc')
    
    // Состояния для фильтров
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState<SavedFilter[]>([])
    const [currentFilterId, setCurrentFilterId] = useState<string | null>(null)
    const [filtersLoading, setFiltersLoading] = useState(false)
    const [showFilterDialog, setShowFilterDialog] = useState(false)
    const [editingFilter, setEditingFilter] = useState<SavedFilter | null>(null)

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
        
        // Проверяем активный фильтр
        const filterId = searchParams.get('filterId')
        setCurrentFilterId(filterId)

        // Инициализация queryColumnsRef из URL
        const searchColumns = searchParams.getAll('searchColumn')
        const searchValues = searchParams.getAll('searchColumnValue')
        queryColumnsRef.current = searchColumns.map((col, i) => ({
            key: col,
            value: searchValues[i]
        }))
    }, [])
    
    // Загрузка фильтров для модели
    useEffect(() => {
        const loadFilters = async () => {
            setFiltersLoading(true)
            try {
                const axios = (await import('axios')).default
                const modelName = page.props.header.entity.name
                const response = await axios.get(`/adminizer/filters?modelName=${modelName}&includeSystem=true`)
                
                if (response.data.success && response.data.filtersEnabled) {
                    setFilters(response.data.data || [])
                }
            } catch (error) {
                console.error('Failed to load filters:', error)
            } finally {
                setFiltersLoading(false)
            }
        }
        
        loadFilters()
    }, [page.props.header.entity.name])

    useEffect(() => {
        // fix menu after deletion and redirect
        document.body.removeAttribute('style')
    }, [data])


    const pagination = useMemo(() => {
        return generatePagination(
            data.recordsFiltered,
            parseInt(count),
            currentPage,
            5
        )
    }, [data.recordsFiltered, count, currentPage, searchValue])

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
        setCurrentFilterId(null)

        router.visit(`${page.props.header.entity.uri}?count=${count}&page=1`, {
            preserveState: true,
            preserveScroll: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }
    
    // Обработчики для фильтров
    const handleSelectFilter = useCallback((filter: SavedFilter) => {
        setCurrentFilterId(filter.id)
        setCurrentPage(1)
        setLoading(true)
        
        const queryString = `count=${count}&page=1&column=${sortColumn}&direction=${sortDirection}&filterId=${filter.id}`
        router.visit(`${page.props.header.entity.uri}?${queryString}`, {
            preserveState: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }, [count, sortColumn, sortDirection, page.props.header.entity.uri])

    const handleCreateFilter = useCallback(() => {
        setEditingFilter(null)
        setShowFilterDialog(true)
    }, [])

    const handleEditFilter = useCallback((filter: SavedFilter) => {
        console.log('handleEditFilter called with:', filter)
        setEditingFilter(filter)
        setShowFilterDialog(true)
    }, [])

    const handleSaveFilter = useCallback(async (filterData: any) => {
        try {
            const isEditing = !!editingFilter
            const url = isEditing 
                ? `/adminizer/filters/${editingFilter.id}` 
                : '/adminizer/filters'
            
            const axios = (await import('axios')).default
            const method = isEditing ? 'patch' : 'post'
            
            const response = await axios[method](url, {
                ...filterData,
                modelName: page.props.header.entity.name
            })
            
            if (response.data?.success) {
                const result = response.data
                
                if (isEditing) {
                    // Обновить в списке
                    setFilters(prev => prev.map(f => 
                        f.id === editingFilter.id ? { ...f, ...result.data } : f
                    ))
                    toast.success(`Filter "${filterData.name}" updated`)
                } else {
                    // Добавить в список
                    setFilters(prev => [...prev, result.data])
                    toast.success(`Filter "${filterData.name}" created`)
                }
                
                setShowFilterDialog(false)
                setEditingFilter(null)
            } else {
                throw new Error(response.data?.error || 'Failed to save filter')
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || error.message || 'Failed to save filter')
        }
    }, [editingFilter, page.props.header.entity.name])

    const handleDeleteFilter = useCallback(async (filter: SavedFilter) => {
        try {
            const axios = (await import('axios')).default
            const response = await axios.delete(`/adminizer/filters/${filter.id}`)
            
            if (response.data.success) {
                // Обновить список фильтров
                setFilters(prev => prev.filter(f => f.id !== filter.id))
                
                // Если удален активный фильтр, сбросить
                if (currentFilterId === filter.id) {
                    setCurrentFilterId(null)
                    resetForm()
                }
                
                toast.success(`Filter "${filter.name}" deleted`)
            } else {
                throw new Error(response.data.error || 'Failed to delete filter')
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || error.message || 'Failed to delete filter')
        }
    }, [currentFilterId, resetForm])

    const handleTogglePin = useCallback(async (filter: SavedFilter) => {
        try {
            const response = await fetch(`/adminizer/filters/${filter.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    isPinned: !filter.isPinned
                })
            })
            
            if (response.ok) {
                // Обновить список фильтров
                setFilters(prev => prev.map(f => 
                    f.id === filter.id 
                        ? { ...f, isPinned: !f.isPinned }
                        : f
                ))
                toast.success(filter.isPinned ? 'Filter unpinned' : 'Filter pinned')
            } else {
                throw new Error('Failed to update filter')
            }
        } catch (error) {
            toast.error('Failed to update filter')
        }
    }, [])

    const dynamicColumns = useTableColumns(
        page.props.columns,
        handleCustomSort,
        handleColumnSearch,
        handleSearch,
        showSearch
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


    return (
        <>
            <Toaster position="top-center" richColors closeButton/>
            
            {/* Filter Dialog */}
            <FilterDialog
                open={showFilterDialog}
                onOpenChange={(open) => {
                    setShowFilterDialog(open)
                    if (!open) setEditingFilter(null)
                }}
                filter={editingFilter || undefined}
                modelName={page.props.header.entity.name}
                fields={Object.entries(page.props.columns || {}).map(([fieldName, col]) => ({
                    name: fieldName,
                    label: col.title || fieldName,
                    type: 'string', // Columns не содержит dataType, используем string по умолчанию
                    options: undefined
                }))}
                availableColumns={Object.entries(page.props.columns || {}).map(([fieldName, col]) => ({
                    id: fieldName,
                    name: fieldName,
                    label: col.title || fieldName,
                    type: 'string',
                    visible: true,
                    sortable: col.orderable || false,
                    width: 'auto'
                }))}
                isAdmin={true}
                onSave={handleSaveFilter}
                labels={{
                    title: editingFilter ? 'Edit Filter' : 'Create Filter',
                    nameLabel: 'Filter Name',
                    namePlaceholder: 'Enter filter name...',
                    descriptionLabel: 'Description',
                    descriptionPlaceholder: 'Enter filter description...',
                    conditionsTab: 'Conditions',
                    columnsTab: 'Columns', 
                    settingsTab: 'Settings',
                    visibilityLabel: 'Visibility',
                    visibilityOptions: {
                        private: 'Private',
                        public: 'Public',
                        groups: 'Groups',
                        system: 'System'
                    },
                    saveButton: editingFilter ? 'Update Filter' : 'Create Filter',
                    cancelButton: 'Cancel',
                    previewButton: 'Preview'
                }}
            />
            
            <div className="flex h-full">
                {/* Filter Sidebar */}
                {showFilters && (
                    <div className="w-64 border-r border-border bg-background/50 p-4">
                        <FilterSidebar
                            filters={filters}
                            currentFilterId={currentFilterId}
                            modelName={page.props.header.entity.name}
                            loading={filtersLoading}
                            onSelectFilter={handleSelectFilter}
                            onCreateFilter={handleCreateFilter}
                            onEditFilter={handleEditFilter}
                            onDeleteFilter={handleDeleteFilter}
                            onTogglePin={handleTogglePin}
                            customLabels={{
                                title: "Filters",
                                createFilter: "Create Filter",
                                searchPlaceholder: "Search filters...",
                                noFilters: "No filters found",
                                groups: {
                                    pinned: "Pinned",
                                    my: "My Filters", 
                                    shared: "Shared",
                                    system: "Auto-generated"
                                }
                            }}
                        />
                    </div>
                )}
                
                {/* Main Content */}
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
                        variant={showFilters ? "default" : "outline"}
                        onClick={() => setShowFilters(!showFilters)}
                        disabled={filtersLoading}
                    >
                        <Icon iconNode={Filter}/>
                        {showFilters ? "Hide Filters" : "Show Filters"}
                        {filters.length > 0 && !filtersLoading && (
                            <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                                {filters.length}
                            </span>
                        )}
                    </Button>
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
                <DataTable
                    columns={tableColumns}
                    data={data.data}
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
            </div>
        </>
    );
}
export default ListTable
