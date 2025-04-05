import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, SharedData} from '@/types';
import {Link, usePage} from "@inertiajs/react";
import {Button} from "@/components/ui/button.tsx";
import {Icon} from "@/components/icon.tsx";
import {MoveLeft} from "lucide-react";
import {FormEventHandler} from "react";

const breadcrumbs: BreadcrumbItem[] = [];

interface AddProps extends SharedData{
    actions: {
        link: string;
        id: string;
        title: string;
        icon: string;
    }[],
    btnBack: {
        title: string;
        link: string;
    },
}

export default function Dashboard() {
    const page = usePage<AddProps>()

    const submit: FormEventHandler = (e) => {
        e.preventDefault()
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <Button className="mb-3 w-fit" asChild>
                    <Link href={page.props.btnBack.link}>
                        <Icon iconNode={MoveLeft}/>
                        {page.props.btnBack.title}
                    </Link>
                </Button>
                <form id="addUserForm" onSubmit={submit} className={page.props.view ? 'cursor-not-allowed' : ''}>
                    <div className="flex flex-col gap-10 max-w-[1144px]">
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
