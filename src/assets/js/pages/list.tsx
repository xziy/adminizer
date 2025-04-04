import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, Columns, SharedData} from '@/types';
import {useTableColumns} from "@/components/table/columns"
import {DataTable} from "@/components/table/data-table"
import {Link, usePage} from "@inertiajs/react";
import {ColumnDef} from "@tanstack/react-table";
import {Button} from "@/components/ui/button.tsx";
import {BetweenHorizontalStart, Eye, Pencil, SquarePlus} from "lucide-react";
import {Icon} from "@/components/icon.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {DropdownMenu} from "@radix-ui/react-dropdown-menu";
import {
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    // DropdownMenuLabel,
    // DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";
import {useEffect} from "react";
import {toast} from "sonner";
import { Toaster } from "@/components/ui/sonner"
import DeleteModal from "@/components/modals/del-modal.tsx";


const breadcrumbs: BreadcrumbItem[] = [];

interface ExtendedSharedData extends SharedData {
    data: {
        data: any[],
    }
    columns: Columns,
    header: {
        actions: {
            link: string;
            id: string;
            title: string;
            icon: string;
        }[],
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
                                            <DeleteModal btnTitle={page.props.header.crudActions.deleteTitle} delModal={page.props.header.delModal} link={`${page.props.header.entity.uri}/remove/${row.original.id}`} />
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuGroup>
                                {/*<DropdownMenuSeparator/>*/}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            }
        }
    ]
    columns = [...columns, ...useTableColumns(page.props.columns)]

    useEffect(() => {
        if (page.props.flash) {
            if (page.props.flash.success) {
                toast.success(page.props.flash.success)
            }
            if (page.props.flash.error) {
                toast.error(page.props.flash.error)
            }
        }

        //Close dropdown menus when the page is hidden
        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                // Find dropdown menus and close them
                document.querySelectorAll('[data-state="open"]').forEach((el) => {
                    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);

    }, [])
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Toaster position="top-center" richColors closeButton />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
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
            </div>
        </AppLayout>
    );
}
