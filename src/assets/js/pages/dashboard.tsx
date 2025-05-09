import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import WidgetLayout from "@/components/widgets/widgets-layout.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <WidgetLayout />
        </AppLayout>
    );
}
