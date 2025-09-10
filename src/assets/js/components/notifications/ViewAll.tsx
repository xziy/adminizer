import {SharedData} from "@/types";
import {router, usePage} from "@inertiajs/react";
import {useCallback, useEffect, useRef, useState} from "react";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs.tsx";
import {LoaderCircle} from "lucide-react";
import General from "@/components/notifications/General.tsx";
import System from "@/components/notifications/System.tsx";
import {useNotifications} from '@/contexts/NotificationContext';
import {INotification} from '../../../../interfaces/types';

interface NotificationProps extends SharedData {
    title: string
    tooltip: string
    notWidgets: string
    notFound: string
    actionsTitles: Record<string, string>
    searchPlaceholder: string
}

const ViewAll = () => {
    const page = usePage<NotificationProps & { url: string }>();
    const {
        allNotifications,
        markAsRead,
        fetchAllNotifications,
        paginateNotifications,
        refreshBellNotifications
    } = useNotifications();
    const [localLoading, setLocalLoading] = useState(true);
    const [filteredNotifications, setFilteredNotifications] = useState<INotification[]>([]);
    const [hasMore, setHasMore] = useState(true);

    // Используем ref для хранения текущего skip
    const currentSkipRef = useRef(20);

    // Получаем активную табу из query параметров
    const getInitialTab = () => {
        const url = new URL(page.url, window.location.origin);
        const typeParam = url.searchParams.get('type');
        if (typeParam === 'system' && page.props.auth.user.isAdministrator) {
            return 'system';
        }
        if (typeParam === 'general') {
            return 'general';
        }
        return 'general';
    };

    const [activeTab, setActiveTab] = useState<string>(getInitialTab());

    // Обновляем активную табу при изменении URL
    useEffect(() => {
        const url = new URL(page.url, window.location.origin);
        const typeParam = url.searchParams.get('type');

        if (typeParam && typeParam !== activeTab) {
            if (typeParam === 'system' && !page.props.auth.user.isAdministrator) {
                setActiveTab('general');
                return;
            }
            setActiveTab(typeParam);
        }
    }, [page.url, activeTab, page.props.auth.user.isAdministrator]);

    // Загрузка данных при изменении активной табы
    useEffect(() => {
        const loadData = async () => {
            setLocalLoading(true);
            currentSkipRef.current = 20; // Сбрасываем ref
            setHasMore(true);
            await fetchAllNotifications(activeTab);
            setTimeout(() => {
                setLocalLoading(false);
            }, 0)
        };
        loadData();
    }, [activeTab]);

    // Фильтрация уведомлений
    useEffect(() => {
        const filtered = allNotifications.filter(notif =>
            notif.notificationClass === activeTab
        );
        setFilteredNotifications(filtered);
    }, [allNotifications, activeTab]);

    const handleTabChange = async (tab: string) => {
        if (tab === 'system' && !page.props.auth.user.isAdministrator) {
            return;
        }

        router.get(page.url, {type: tab}, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });

    };

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        try {
            await markAsRead(notificationClass, id);
            await refreshBellNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
            throw error;
        }
    };

    // Используем useCallback для стабильной ссылки на функцию
    const handleLoadMore = useCallback(async () => {
        if (!hasMore || localLoading) return;

        const newNotifications = await paginateNotifications(activeTab, currentSkipRef.current);

        if (newNotifications.length < 20) {
            setHasMore(false);
        }

        // Обновляем оба значения
        currentSkipRef.current = currentSkipRef.current + 20;
    }, [hasMore, localLoading, activeTab, paginateNotifications]);

    const renderContent = (viewType: 'general' | 'system') => {
        if (localLoading) {
            return <LoaderCircle className="mx-auto mt-14 size-8 animate-spin"/>;
        }
        if (!localLoading && allNotifications.length > 0) {
            return viewType === 'general'
                ? <General notifications={filteredNotifications}
                           onMarkAsRead={handleMarkAsRead}
                           onLoadMore={handleLoadMore}
                           hasMore={hasMore}
                />
                : <System notifications={filteredNotifications}
                          onMarkAsRead={handleMarkAsRead}
                          onLoadMore={handleLoadMore}
                          hasMore={hasMore}
                />;
        } else {
            return <div className="text-center font-medium mt-8">No notifications found</div>;
        }
    };

    return (
        <div className="flex h-auto flex-1 flex-col gap-4 rounded-xl p-4">
            <h1 className="font-bold text-xl">{page.props.title}</h1>
            <Tabs value={activeTab} className="w-full" onValueChange={handleTabChange}>
                <TabsList className="w-full mb-4">
                    <TabsTrigger
                        value="general"
                        disabled={localLoading}
                    >
                        General
                    </TabsTrigger>
                    {page.props.auth.user.isAdministrator &&
                        <TabsTrigger
                            value="system"
                            disabled={localLoading}
                        >
                            System
                        </TabsTrigger>
                    }
                </TabsList>
                <TabsContent value="general">{renderContent('general')}</TabsContent>
                {page.props.auth.user.isAdministrator &&
                    <TabsContent value="system">{renderContent('system')}</TabsContent>
                }
            </Tabs>
        </div>
    );
}

export default ViewAll;