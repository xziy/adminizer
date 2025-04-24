import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import Form from "@/components/form.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

export default function FormWrapper() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Form />
        </AppLayout>
    );
}
