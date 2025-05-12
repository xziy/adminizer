import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import CatalogTree from "@/components/catalog/CatalogTree.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

export default function Catalog() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <CatalogTree />
            </div>
        </AppLayout>
    );
}
