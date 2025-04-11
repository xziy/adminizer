import {SidebarInset} from '@/components/ui/sidebar';
import AppShell from '@/components/app-shell';
import {AppSidebar} from '@/components/app-sidebar';
import {AppSidebarHeader} from '@/components/app-sidebar-header';
import {type BreadcrumbItem} from '@/types';
import {memo, type PropsWithChildren} from 'react';

const AppSidebarLayout = memo(({children, breadcrumbs = [], className}: PropsWithChildren<{
    breadcrumbs?: BreadcrumbItem[],
    className?: string
}>) => {
    return (
        <AppShell variant="sidebar">
            <AppSidebar/>
            <SidebarInset className={className}>
                <AppSidebarHeader breadcrumbs={breadcrumbs}/>
                {children}
            </SidebarInset>
        </AppShell>
    );
})

export default AppSidebarLayout
