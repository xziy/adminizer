import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Payment, columns } from "@/components/table/columns"
import { DataTable } from "@/components/table/data-table"

const breadcrumbs: BreadcrumbItem[] = [

];

export default function List() {
    const data: Payment[] = [
        {
            id: "728ed52f",
            amount: 100,
            status: "pending",
            email: "m@example.com",
        },
        // ...
    ]
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <DataTable columns={columns} data={data} />
            </div>
        </AppLayout>
    );
}
