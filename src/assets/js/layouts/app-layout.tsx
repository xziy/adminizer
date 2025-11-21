import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import {type BreadcrumbItem} from '@/types';
import {memo, type ReactNode} from 'react';
import {NotificationProvider} from '@/contexts/NotificationContext';
import {AiAssistantProvider} from '@/contexts/AiAssistantContext';
import {AiAssistantViewport} from '@/components/ai-assistant/AiAssistantViewport';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    className?: string;
}

const AppLayout = memo(({children, className, breadcrumbs, ...props}: AppLayoutProps) => {
    return (
        <NotificationProvider>
            <AiAssistantProvider>
                <AppLayoutTemplate breadcrumbs={breadcrumbs} className={className} {...props}>
                    {children}
                </AppLayoutTemplate>
                <AiAssistantViewport />
            </AiAssistantProvider>
        </NotificationProvider>
    )
});

export default AppLayout;
