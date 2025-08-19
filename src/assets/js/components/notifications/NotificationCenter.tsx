// components/NotificationCenter.tsx
import { useState, useEffect } from 'react';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    priority: string;
    createdAt: string;
    read: boolean;
}

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const eventSource = new EventSource(`${window.routePrefix}/api/notifications/stream`);

        // Обработчик для события 'connected'
        eventSource.addEventListener('connected', (event) => {
            const data = JSON.parse((event as MessageEvent).data);
            console.log('Connected event:', data);
            setIsConnected(true);
        });

        // Обработчик для события 'notification'
        eventSource.addEventListener('notification', (event) => {
            const data = JSON.parse((event as MessageEvent).data);
            console.log('Notification event:', data);
            setNotifications(prev => [data, ...prev.slice(0, 49)]);
        });

        // Обработчик для общих сообщений (если нужно)
        eventSource.onmessage = (event) => {
            console.log('Generic message:', event.data);
        };

        eventSource.onerror = () => {
            console.error('SSE connection error');
            setIsConnected(false);
        };

        return () => eventSource.close();
    }, []);

    const markAsRead = async (id: string) => {
        await fetch(`/adminizer/api/notifications/${id}/read`, {
            method: 'PUT'
        });
        setNotifications(prev => prev.map(n =>
            n.id === id ? { ...n, read: true } : n
        ));
    };

    return (
        <div className="notification-center relative">
            <div className="notification-header">
                <h3>Уведомления {isConnected ? '🟢' : '🔴'}</h3>
            </div>
            <div className="notification-list flex flex-col gap-2 absolute w-[250px] bg-white z-[1111] p-3 shadow">
                {notifications.map(notification => (
                    <div key={notification.id} className={`notification ${notification.type} ${notification.read ? 'read' : 'unread'} border-b-2 last:border-none`}>
                        <div className="notification-title">{notification.title}</div>
                        <div className="notification-message">{notification.message}</div>
                        <button onClick={() => markAsRead(notification.id)}>
                            {notification.read ? '✓ Прочитано' : 'Пометить прочитанным'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}