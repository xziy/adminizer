import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import {type BreadcrumbItem} from '@/types';
import {memo, type ReactNode} from 'react';
import {NotificationProvider} from '@/contexts/NotificationContext';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

const AppLayout = memo(({children, className, breadcrumbs, ...props}: AppLayoutProps) => {
    return (
        <NotificationProvider>
            <AppLayoutTemplate breadcrumbs={breadcrumbs} className={className} {...props}>
                {children}
            </AppLayoutTemplate>
        </NotificationProvider>
    )
});

export default AppLayout;
