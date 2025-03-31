import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, Columns, SharedData} from '@/types';
import {useTableColumns} from "@/components/table/columns"
import {DataTable} from "@/components/table/data-table"
import {Link, usePage} from "@inertiajs/react";
import {ColumnDef} from "@tanstack/react-table";
import {Button} from "@/components/ui/button.tsx";
import {SquarePlus} from "lucide-react";
import {Icon} from "@/components/icon.tsx";
import MaterialIcon from "@/components/material-icon.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

interface ExtendedSharedData extends SharedData {
    data: {
        data: any[],
    }
    columns: Columns,
    header: {
        create: {
            title: string;
            link: string;
        },
        actions: {
            link: string;
            id: string;
            title: string;
            icon: string;
        }[]
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
                    Actions
                </div>
            )
        }
    ]
    columns = [...columns, ...useTableColumns(page.props.columns)]
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex gap-6">
                    <Button className="mb-3" asChild>
                        <Link href={page.props.header.create.link}>
                            <Icon iconNode={SquarePlus}/>
                            {page.props.header.create.title}
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        {page.props.header.actions.map((action) => (
                            <Button className="mb-3" asChild variant="outline" key={action.id}>
                                <a href={action.link} target='_blank'>
                                    <MaterialIcon name={action.icon} className="!text-[18px]" />
                                    {action.title}
                                </a>
                            </Button>
                        )) || null}
                    </div>
                </div>
                <DataTable columns={columns} data={data.data}/>
            </div>
        </AppLayout>
    );
}
