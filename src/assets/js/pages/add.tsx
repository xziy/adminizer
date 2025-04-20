import {type BreadcrumbItem} from "@/types";
import AppLayout from "@/layouts/app-layout.tsx";
import AddForm from "@/components/add-form.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

export default function Add() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <AddForm />
        </AppLayout>
    )
}
