import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Eye, Braces} from "lucide-react";
import {useEffect, useRef, useState} from "react";
import {INotification} from "../../../../interfaces/types.ts";
import {DiffViewer} from "@/components/notifications/DiffViewer.tsx";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {NotificationProps} from "@/types";
import {debounce} from 'lodash';

interface NotificationTableProps extends NotificationProps {
    showDiff?: boolean;
}

export const NotificationTable = (
    {
        notifications,
        onMarkAsRead,
        onLoadMore,
        hasMore = false,
        showDiff = false
    }: NotificationTableProps) => {
    const tableContent = useRef<HTMLTableElement>(null);
    const loadingRef = useRef(false);
    const [uniqueNotifications, setUniqueNotifications] = useState<INotification[]>([]);
    const [diffOpen, setDiffOpen] = useState(false);
    const [diffItem, setDiffItem] = useState<any>(null);

    const debouncedLoadMore = useRef(
        debounce(() => {
            if (onLoadMore && hasMore && !loadingRef.current) {
                loadingRef.current = true;
                onLoadMore()
                loadingRef.current = false;

            }
        }, 300)
    ).current;

    // Убираем дубликаты по ID
    useEffect(() => {
        const uniqueIds = new Set();
        const filtered = notifications.filter(notif => {
            if (uniqueIds.has(notif.id)) return false;
            uniqueIds.add(notif.id);
            return true;
        });
        setUniqueNotifications(filtered);
    }, [notifications]);

    // Infinite scroll только если есть onLoadMore
    useEffect(() => {
        if (!onLoadMore) return;

        const handleScroll = () => {
            if (loadingRef.current || !hasMore) return;

            const scrollContainer = tableContent.current;
            if (!scrollContainer) return;

            const {scrollTop, scrollHeight, clientHeight} = scrollContainer;
            const scrollPosition = scrollTop + clientHeight;

            // Проверяем, достигли ли мы нижней части
            if (scrollPosition >= scrollHeight - 600) {
                debouncedLoadMore();
            }
        };

        const scrollContainer = tableContent.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);

            // Очистка
            return () => {
                scrollContainer.removeEventListener('scroll', handleScroll);
                debouncedLoadMore.cancel(); // Отменяем pending debounced вызовы
            };
        }
    }, [hasMore, onLoadMore, debouncedLoadMore]);

    useEffect(() => {
        return () => {
            debouncedLoadMore.cancel();
        };
    }, [debouncedLoadMore]);

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        try {
            await onMarkAsRead(notificationClass, id);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <div>
            <Table wrapperHeight="max-h-[75vh]" ref={tableContent}>
                <TableHeader className="sticky top-0 bg-background shadow z-1">
                    <TableRow>
                        <TableHead className="p-2 text-left"></TableHead>
                        <TableHead className="p-2 text-left">Title</TableHead>
                        <TableHead className="p-2 text-left">Message</TableHead>
                        <TableHead className="p-2 text-left">Date</TableHead>
                        {showDiff && <TableHead className="p-2 text-left">Diff</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {uniqueNotifications.map((notification) => (
                        <TableRow key={notification.id}
                                  className={`${!notification.read ? 'bg-chart-1/20 hover:bg-chart-1/20' : ''}`}>
                            <TableCell className={`p-2 ${showDiff ? 'align-middle' : 'align-top'} pt-2.5`}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon"
                                                className={`size-4 ${notification.read ? 'opacity-50 pointer-events-none' : ''}`}
                                                onClick={() => handleMarkAsRead(notification.notificationClass, notification.id)}>
                                            <Eye className="text-primary"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="z-[1003]">
                                        <p>Make read</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell className={`p-2 ${showDiff ? 'align-middle' : 'align-top'} font-medium`}>
                                {notification.title}
                            </TableCell>
                            <TableCell
                                className={`p-2 ${showDiff ? 'align-middle' : 'align-top'} whitespace-break-spaces`}>
                                <div className="max-w-[500px] whitespace-break-spaces">
                                    {notification.message}
                                </div>
                            </TableCell>
                            <TableCell className={`p-2 ${showDiff ? 'align-middle' : 'align-top'}`}>
                                {new Date(notification.createdAt).toLocaleString()}
                            </TableCell>
                            {showDiff && notification.metadata?.changes && (
                                <TableCell className="p-2 align-top">
                                    <Button variant="green" size="sm" onClick={() => {
                                        setDiffItem(notification.metadata?.changes);
                                        setDiffOpen(true);
                                    }}>
                                        <Braces/>
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                    <TableRow>
                        {!hasMore && (
                            <TableCell colSpan={showDiff ? 5 : 4}>
                                <div className="text-center py-2 font-medium">The end of the list has been reached</div>
                            </TableCell>
                        )}
                    </TableRow>
                </TableBody>
            </Table>

            {showDiff && (
                <Dialog open={diffOpen} onOpenChange={(open) => {
                    setDiffOpen(open);
                    if (!open) {
                        setTimeout(() => {
                            document.body.removeAttribute('style');
                        }, 300);
                    }
                }}>
                    <DialogContent className="z-[1022] sm:max-w-[60vw]">
                        <DialogHeader>
                            <DialogTitle>Diff</DialogTitle>
                        </DialogHeader>
                        <DiffViewer changes={diffItem} className="max-h-[80vh] overflow-auto sm:max-w-[60vw] w-full"/>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};