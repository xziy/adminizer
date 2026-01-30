import ViewAll from "@/components/history/all/ViewAll";
import AppLayout from "@/layouts/app-layout.tsx";
import type {BreadcrumbItem} from "@/types";

const breadcrumbs: BreadcrumbItem[] = [];

const HistoryList = () => {
    return(
        <AppLayout breadcrumbs={breadcrumbs}>
            <ViewAll/>
        </AppLayout>
    )
}

export default HistoryList;