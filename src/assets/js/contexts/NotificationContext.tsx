import React, { createContext, useContext, useState, useEffect } from 'react';
import { INotification } from '../../../interfaces/types';
import axios from 'axios';

interface NotificationContextType {
    bellNotifications: INotification[];
    allNotifications: INotification[];
    unreadCount: number;
    markAsRead: (notificationClass: string, id: string) => Promise<void>;
    fetchAllNotifications: (type?: string) => Promise<INotification[]>;
    loading: boolean;
    refreshBellNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [bellNotifications, setBellNotifications] = useState<INotification[]>([]);
    const [allNotifications, setAllNotifications] = useState<INotification[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchBellNotifications = async () => {
        try {
            const res = await axios.get(`${window.routePrefix}/api/notifications`, {
                params: { unreadOnly: true, limit: 4 }
            });
            setBellNotifications(res.data);
        } catch (error) {
            console.error('Error fetching bell notifications:', error);
        }
    };

    const refreshBellNotifications = async () => {
        await fetchBellNotifications();
    };

    const fetchAllNotifications = async (type?: string) => {
        setLoading(true);
        try {
            const url = type
                ? `${window.routePrefix}/api/notifications/${type}`
                : `${window.routePrefix}/api/notifications`;

            const res = await axios.get(url);
            setAllNotifications(res.data);
            return res.data;
        } catch (error) {
            console.error('Error fetching all notifications:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBellNotifications();

        const eventSource = new EventSource(`${window.routePrefix}/api/notifications/stream`);

        eventSource.addEventListener('connected', (event) => {
            const data = JSON.parse((event as MessageEvent).data);
            console.log('Connected event:', data);
        });

        eventSource.addEventListener('notification', (event) => {
            const data = JSON.parse((event as MessageEvent).data);

            // Добавляем новое уведомление в оба списка
            setBellNotifications(prev => [data, ...prev.filter(n => n.id !== data.id)].slice(0, 4));
            setAllNotifications(prev => [data, ...prev.filter(n => n.id !== data.id)]);
        });

        eventSource.onerror = () => {
            console.error('SSE connection error');
        };

        return () => eventSource.close();
    }, []);

    const markAsRead = async (notificationClass: string, id: string) => {
        try {
            await axios.put(`${window.routePrefix}/api/notifications/${notificationClass}/${id}/read`, {});

            // Обновляем только allNotifications
            setAllNotifications(prev =>
                prev.map(notif =>
                    notif.id === id ? { ...notif, read: true } : notif
                )
            );

            // После пометки как прочитанное, загружаем свежие непрочитанные для колокольчика
            await fetchBellNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
            throw error;
        }
    };

    const unreadCount = bellNotifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            bellNotifications,
            allNotifications,
            unreadCount,
            markAsRead,
            fetchAllNotifications,
            loading,
            refreshBellNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};