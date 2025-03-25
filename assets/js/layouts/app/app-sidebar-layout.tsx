import {SidebarInset} from '@/components/ui/sidebar';
import {AppShell} from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem} from '@/types';
import {type PropsWithChildren} from 'react';

export default function AppSidebarLayout({children, breadcrumbs = []}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[]
}>) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar/>
            <SidebarInset>
                <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                {children}
            </SidebarInset>
        </AppShell>
    );
}
