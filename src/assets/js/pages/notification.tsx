import AppLayout from "@/layouts/app-layout.tsx";
import type {BreadcrumbItem} from "@/types";
import ViewAll from "@/components/notifications/ViewAll.tsx";

const breadcrumbs: BreadcrumbItem[] = [];
const Notification = () => {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <ViewAll />
        </AppLayout>
    )
}
export default Notification