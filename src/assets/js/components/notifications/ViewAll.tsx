import {SharedData} from "@/types";
import {usePage, router} from "@inertiajs/react";
import {useEffect, useState} from "react";
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
        loading: contextLoading,
        refreshBellNotifications
    } = useNotifications();
    const [localLoading, setLocalLoading] = useState(true);
    const [filteredNotifications, setFilteredNotifications] = useState<INotification[]>([]);
    const [currentSkip, setCurrentSkip] = useState(20); // Добавляем состояние для skip
    const [hasMore, setHasMore] = useState(true);

    // Получаем активную табу из query параметров
    const getInitialTab = () => {
        const url = new URL(page.url, window.location.origin);
        const typeParam = url.searchParams.get('type');
        // Проверяем, что тип валидный и пользователь имеет доступ
        if (typeParam === 'system' && page.props.auth.user.isAdministrator) {
            return 'system';
        }
        if (typeParam === 'general') {
            return 'general';
        }
        return 'general'; // значение по умолчанию
    };

    const [activeTab, setActiveTab] = useState<string>(getInitialTab());

    // Обновляем активную табу при изменении URL
    useEffect(() => {
        const url = new URL(page.url, window.location.origin);
        const typeParam = url.searchParams.get('type');

        if (typeParam && typeParam !== activeTab) {
            // Проверяем доступ для системных уведомлений
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
            setCurrentSkip(20); // Сбрасываем skip при смене таба
            setHasMore(true);
            await fetchAllNotifications(activeTab);
            setLocalLoading(false);
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
        // Проверяем доступ для системных уведомлений
        if (tab === 'system' && !page.props.auth.user.isAdministrator) {
            return;
        }

        setActiveTab(tab);
        setLocalLoading(true);

        // Обновляем URL с query параметром
        router.get(page.url, {type: tab}, {
            preserveState: true,
            preserveScroll: true,
            replace: true
        });

        await fetchAllNotifications(tab);
        setLocalLoading(false);
    };

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        try {
            await markAsRead(notificationClass, id);
            // После пометки как прочитанное, обновляем колокольчик
            await refreshBellNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
            throw error;
        }
    };

    const handleLoadMore = async () => {
        if (!hasMore || localLoading) return;

        const newNotifications = await paginateNotifications(activeTab, currentSkip);

        // Если пришло меньше 20 уведомлений, значит это последняя страница
        if (newNotifications.length < 20) {
            setHasMore(false);
        }

        // Увеличиваем skip на 20 для следующей загрузки
        setCurrentSkip(prev => prev + 20);
    };

    const renderContent = (viewType: 'general' | 'system') => {
        if (localLoading || contextLoading) {
            return <LoaderCircle className="mx-auto mt-14 size-8 animate-spin"/>;
        }
        if (filteredNotifications.length === 0) {
            return <div className="text-center font-medium mt-8">No notifications found</div>;
        }

        return viewType === 'general'
            ? <General notifications={filteredNotifications}
                       onMarkAsRead={handleMarkAsRead}
                       onLoadMore={handleLoadMore}
                       hasMore={hasMore}
            />
            : <System notifications={filteredNotifications} onMarkAsRead={handleMarkAsRead}/>;
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