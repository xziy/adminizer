import {useState, useEffect} from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Bell, Info, Eye} from "lucide-react";
import {INotification} from "../../../../interfaces/types.ts"
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar.tsx";
import {useInitials} from '@/hooks/use-initials';
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import MaterialIcon from "@/components/material-icon.tsx";

export function NotificationCenter() {
    const [notifications, setNotifications] = useState<INotification[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const getInitials = useInitials();

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
            n.id === id ? {...n, read: true} : n
        ));
    };

    const getRelativeTime = (date: string | Date): string => {
        const now = new Date();
        const dateObj = new Date(date);

        const diffInMs = now.getTime() - dateObj.getTime();
        const diffInSeconds = Math.floor(diffInMs / 1000);

        const rtf = new Intl.RelativeTimeFormat('en', {numeric: 'auto'});

        if (diffInSeconds < 60) {
            return rtf.format(-diffInSeconds, 'second');
        }

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return rtf.format(-diffInMinutes, 'minute');
        }

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return rtf.format(-diffInHours, 'hour');
        }

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) {
            return rtf.format(-diffInDays, 'day');
        }

        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) {
            return rtf.format(-diffInMonths, 'month');
        }

        const diffInYears = Math.floor(diffInMonths / 12);
        return rtf.format(-diffInYears, 'year');
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild className="cursor-pointer data-[state=open]:bg-sidebar-accent">
                    <Button variant="ghost">
                        <Bell/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-[1002] p-2" align="end" onCloseAutoFocus={e => e.preventDefault()}>
                    <DropdownMenuGroup>
                        {notifications.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">
                                No notifications
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div key={notification.id}>
                                    <DropdownMenuItem asChild className="cursor-pointer"
                                                      onSelect={e => e.preventDefault()}>
                                        <div
                                            className="grid grid-cols-[32px_250px] grid-rows-[auto_1fr] items-start gap-x-4 gap-y-2">
                                            {notification.icon  ? (
                                                <MaterialIcon name={notification.icon.icon} style={{color: notification.icon.iconColor}} className="!text-[32px]"/>
                                            ) : (
                                                <div></div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-medium">{notification.title}</span>
                                                <span className="truncate">{notification.message}</span>
                                            </div>
                                            <div className="col-start-2 flex justify-between flex-nowrap items-center">
                                                <div className="flex flex-nowrap gap-2 items-center">
                                                    {notification.notificationClass === 'general' ? (
                                                        <div className="font-medium">Info</div>
                                                    ) : (
                                                        <div className="font-medium">Activity</div>
                                                    )}
                                                    <span>&#9679;</span>
                                                    <div>{getRelativeTime(notification.createdAt)}</div>
                                                </div>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="size-4">
                                                            <Eye/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="left" className="z-[1003]">
                                                        <p>Make read</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator/>
                                </div>
                            ))
                        )}
                    </DropdownMenuGroup>
                    <Button variant="secondary" className="w-full">View All</Button>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}