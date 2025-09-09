import {INotification} from "../../../../interfaces/types.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Eye} from "lucide-react";
import {useEffect, useRef} from "react";

interface GeneralProps {
    notifications: INotification[];
    onMarkAsRead: (notificationClass: string, id: string) => Promise<void>;
    onLoadMore: () => void;
    hasMore: boolean;
}

const General = ({notifications, onMarkAsRead, onLoadMore, hasMore}: GeneralProps) => {
    const tableContent = useRef<HTMLTableElement>(null);
    const loadingRef = useRef(false);

    useEffect(() => {
        const handleScroll = () => {
            // Если уже загружаем или больше нечего загружать - выходим
            if (loadingRef.current || !hasMore) return;

            const scrollContainer = tableContent.current;
            if (!scrollContainer) return;

            const {scrollTop, scrollHeight, clientHeight} = scrollContainer;

            // Проверяем, достигли ли мы нижней части таблицы
            if (scrollTop + clientHeight >= scrollHeight - 100) {
                loadingRef.current = true;
                onLoadMore();
            }
        };

        const scrollContainer = tableContent.current;
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll);
            return () => scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, [hasMore, onLoadMore]);

    // Сбрасываем флаг загрузки после завершения загрузки новых данных
    useEffect(() => {
        loadingRef.current = false;
    }, [notifications]);

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        try {
            await onMarkAsRead(notificationClass, id);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <Table wrapperHeight="max-h-[75vh]" ref={tableContent}>
            <TableHeader className="sticky top-0 bg-background shadow z-1">
                <TableRow>
                    <TableHead className="p-2 text-left"></TableHead>
                    <TableHead className="p-2 text-left">Title</TableHead>
                    <TableHead className="p-2 text-left">Message</TableHead>
                    <TableHead className="p-2 text-left">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {notifications.map((notification) => (
                    <TableRow key={notification.id}
                              className={`${!notification.read ? 'bg-chart-1/20 hover:bg-chart-1/20' : ''}`}>
                        <TableCell className="p-2 align-top pt-2.5">
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
                        <TableCell className="p-2 align-top font-medium">
                            {notification.title}
                        </TableCell>
                        <TableCell className="p-2 whitespace-break-spaces">
                            <div className="max-w-[500px] whitespace-break-spaces">
                                {notification.message}
                            </div>
                        </TableCell>
                        <TableCell className="p-2 align-top">
                            {new Date(notification.createdAt).toLocaleString()}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
export default General;