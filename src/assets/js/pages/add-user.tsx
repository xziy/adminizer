import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {usePage} from "@inertiajs/react";

const breadcrumbs: BreadcrumbItem[] = [

];

export default function Dashboard() {
    const page = usePage()
    console.log(page.props)
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                Add User
                <pre>
                    {JSON.stringify(page.props, null, 4)}
                </pre>
            </div>
        </AppLayout>
    );
}
