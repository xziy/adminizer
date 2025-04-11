import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import {type BreadcrumbItem} from '@/types';
import {memo, type ReactNode} from 'react';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

const AppLayout = memo(({children, className, breadcrumbs, ...props}: AppLayoutProps) => {
    console.log('AppLayout')
    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} className={className} {...props}>
            {children}
        </AppLayoutTemplate>
    )
});

export default AppLayout;
