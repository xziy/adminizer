import {usePage} from "@inertiajs/react";
import {type BreadcrumbItem, SharedData} from "@/types";
import React, {FC, useState, useEffect} from "react";
import AppLayout from "@/layouts/app-layout.tsx";

export interface ComponentType {
    default: FC<{ message?: string }>;
}

const breadcrumbs: BreadcrumbItem[] = [];
export default function Module() {
    const page = usePage<SharedData>()
    const [Component, setComponent] = useState<React.ReactElement | null>(null);

    useEffect(() => {
        const initModule = async () => {
            const Module = await import(/* @vite-ignore */ page.props.moduleComponent as string);
            const Component = Module.default as ComponentType['default'];
            setComponent(<Component {...{message: page.props.message as string}} />);
        }
        initModule();
    }, [])


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="m-5">
                <div className="mb-5">
                    <h1>{page.props.title as string}</h1>
                </div>
                {Component || null}
            </div>
        </AppLayout>
    )
}
