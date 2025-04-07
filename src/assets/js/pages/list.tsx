import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, Columns, SharedData} from '@/types';
import {useTableColumns} from "@/components/table/columns"
import {DataTable} from "@/components/table/data-table"
import {Link, router, usePage} from "@inertiajs/react";
import {ColumnDef} from "@tanstack/react-table";
import {Button} from "@/components/ui/button.tsx";
import {BetweenHorizontalStart, Eye, Pencil, SquarePlus} from "lucide-react";
import {Icon} from "@/components/icon.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {DropdownMenu} from "@radix-ui/react-dropdown-menu";
import {
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator,
    // DropdownMenuLabel,
    // DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {useCallback, useEffect, useMemo, useState} from "react";
import {toast} from "sonner";
import {Toaster} from "@/components/ui/sonner"
import DeleteModal from "@/components/modals/del-modal.tsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.tsx";
import {
    Pagination,
    PaginationContent,
    // PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import {generatePagination} from "@/lib/pagination.ts";

interface Action {
    id: string,
    title: string,
    icon: string,
    link: string
}

const breadcrumbs: BreadcrumbItem[] = [];

interface ExtendedSharedData extends SharedData {
    data: {
        data: any[],
        recordsTotal: number
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
        delModal: {
            yes: string,
            no: string
            text: string
        }
    }
}

export default function List() {
    const page = usePage<ExtendedSharedData>()
    const data = page.props.data
    const [count, setCount] = useState("2")
    const [loading, setLoading] = useState(false)

    const searchParams = new URLSearchParams(window.location.search);
    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));

    let columns: ColumnDef<any>[] = [
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                    <BetweenHorizontalStart/>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-46" side="right" align="start">
                                <DropdownMenuGroup>
                                    {page.props.header.crudActions?.editTitle && (
                                        <DropdownMenuItem asChild className="cursor-pointer">
                                            <Link href={`${page.props.header.entity.uri}/edit/${row.original.id}`}>
                                                <Icon iconNode={Pencil}/>
                                                {page.props.header.crudActions.editTitle}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {page.props.header.crudActions?.viewsTitle && (
                                        <DropdownMenuItem asChild className="cursor-pointer">
                                            <Link href={`${page.props.header.entity.uri}/view/${row.original.id}`}>
                                                <Icon iconNode={Eye}/>
                                                {page.props.header.crudActions.viewsTitle}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {page.props.header.crudActions?.deleteTitle && (
                                        <DropdownMenuItem asChild className="cursor-pointer">
                                            <DeleteModal btnTitle={page.props.header.crudActions.deleteTitle}
                                                         delModal={page.props.header.delModal}
                                                         link={`${page.props.header.entity.uri}/remove/${row.original.id}`}/>
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                                {page.props.header.inlineActions && page.props.header.inlineActions.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        {page.props.header.inlineActions.map((action: Action) => (
                                            <DropdownMenuItem
                                                key={action.id}
                                                asChild
                                                className="cursor-pointer"
                                            >
                                                <Link
                                                    href={`${action.link}/${row.original.id}?id=${row.original.id}&entity=${page.props.header.entity.name}`}
                                                >
                                                    {action.icon && <MaterialIcon name={action.icon} className="!text-[18px] mr-2" />}
                                                    <span>{action.title}</span>
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            }
        }
    ]
    columns = [...columns, ...useTableColumns(page.props.columns)]

    const pagination = useMemo(() => {
        return generatePagination(
            data.recordsTotal,
            parseInt(count),
            currentPage,
            {
                path: '/dadsa',
                showPages: Math.ceil(data.recordsTotal / parseInt(count)), // Pages count
            }
        )

    }, [data.recordsTotal, count, currentPage])

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

    useEffect(() => {
        //Close dropdown menus when the page is hidden
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                // Find dropdown menus and close them
                document.querySelectorAll('[data-state="open"]').forEach((el) => {
                    el.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [])

    const handlePageChange = useCallback((value: number) => {
        setCurrentPage(value)
        setLoading(true)
        router.visit(`${page.props.header.entity.uri}?count=${count}&page=${value}`, {
            preserveState: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }, [count])

    const changeCount = useCallback((newCount: string) => {
        setCount(newCount)
        setCurrentPage(1) // Reset to page 1 when count change
        setLoading(true)
        router.visit(`${page.props.header.entity.uri}?count=${newCount}&page=1`, {
            preserveState: true,
            only: ['data', 'columns', 'header'],
            onSuccess: () => setLoading(false)
        })
    }, [page.props.header.entity.uri])

    const renderPagination = () => (
        <Pagination>
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${!pagination.prev_page_url ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (pagination.prev_page_url) {
                                handlePageChange(currentPage - 1)
                            }
                        }}
                    />
                </PaginationItem>
                {pagination.links.map((link, index) => {
                    if (link.label === 'Previous' || link.label === 'Next') return null
                    return (
                        <PaginationItem key={index}>
                            <PaginationLink
                                className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${link.active ? '!bg-primary dark:!bg-muted-foreground !text-primary-foreground dark:!text-ring' : ''}`}
                                onClick={(e) => {
                                    e.preventDefault()
                                    if (link.url) {
                                        const pageNumber = parseInt(link.label)
                                        handlePageChange(pageNumber)
                                    }
                                }}
                                isActive={link.active}
                            >
                                {link.label}
                            </PaginationLink>
                        </PaginationItem>
                    )
                })}
                <PaginationItem>
                    <PaginationNext
                        className={`cursor-pointer bg-secondary hover:bg-muted-foreground/15 ${!pagination.next_page_url ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={(e) => {
                            e.preventDefault()
                            if (pagination.next_page_url) {
                                handlePageChange(currentPage + 1)
                            }
                        }}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Toaster position="top-center" richColors closeButton/>
            <div className={`flex h-full flex-1 flex-col gap-4 rounded-xl p-4 ${loading ? 'opacity-50' : ''}`}>
                <div className="flex gap-6">
                    {page.props.header.crudActions?.createTitle && (
                        <Button className="mb-3" asChild>
                            <Link href={`${page.props.header.entity.uri}/add`}>
                                <Icon iconNode={SquarePlus}/>
                                {page.props.header.crudActions.createTitle}
                            </Link>
                        </Button>
                    )}
                    <div className="flex gap-2">
                        {page.props.header.actions.map((action) => (
                            <Button className="mb-3" asChild variant="outline" key={action.id}>
                                <a href={action.link} target='_blank'>
                                    <MaterialIcon name={action.icon} className="!text-[18px]"/>
                                    {action.title}
                                </a>
                            </Button>
                        )) || null}
                    </div>
                </div>
                <DataTable columns={columns} data={data.data} notFoundContent={page.props.header.notFoundContent}/>
                <div className="mt-4 flex justify-between items-end">
                    <div>
                        <p className="text-sm text-foreground/70 mb-2">Show {pagination.from} - {pagination.to} of {pagination.total}</p>
                        <div className="max-w-fit">
                            <Select onValueChange={(value) => changeCount(value)}
                                    defaultValue={count}>
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder={count}/>
                                </SelectTrigger>
                                <SelectContent>
                                    {['2', '5', '10', '50'].map((option) => (
                                        <SelectItem value={option}
                                                    key={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        {renderPagination()}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
