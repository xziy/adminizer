import {SidebarInset} from '@/components/ui/sidebar';
import {AppShell} from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem} from '@/types';
import {type PropsWithChildren} from 'react';

export default function AppSidebarLayout({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar/>
            <SidebarInset className={className}>
                <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                {children}
            </SidebarInset>
        </AppShell>
    );
}
