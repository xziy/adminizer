// import AppLayout from '@/layouts/app-layout';
// import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

// const breadcrumbs: BreadcrumbItem[] = [
//     {
//         title: 'Dashboard',
//         href: '/',
//     },
// ];

export default function Dashboard() {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
               Dashboard
            </div>
        </>
    );
}
