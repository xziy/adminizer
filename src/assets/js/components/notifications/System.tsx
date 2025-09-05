import {INotification, DiffChanges} from "../../../../interfaces/types.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Braces, Eye} from "lucide-react";
import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {DiffViewer} from "@/components/notifications/DiffViewer.tsx";

interface SystemProps {
    notifications: INotification[];
    onMarkAsRead: (notificationClass: string, id: string) => Promise<void>;
}

const System = ({notifications, onMarkAsRead}: SystemProps) => {
    const [delOpen, setDelOpen] = useState(false);
    const [diffItem, setDiffItem] = useState<INotification['metadata'] | null>(null);

    const handleMarkAsRead = async (notificationClass: string, id: string) => {
        try {
            await onMarkAsRead(notificationClass, id);
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    return (
        <div>
            <Table wrapperHeight="max-h-[75vh]">
                <TableHeader className="sticky top-0 bg-background shadow z-1">
                    <TableRow>
                        <TableHead className="p-2 text-left"></TableHead>
                        <TableHead className="p-2 text-left">Title</TableHead>
                        <TableHead className="p-2 text-left">Message</TableHead>
                        <TableHead className="p-2 text-left">Date</TableHead>
                        <TableHead className="p-2 text-left">Diff</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {notifications.map((notification) => (
                        <TableRow key={notification.id} className={`${!notification.read ? 'bg-chart-1/20 hover:bg-chart-1/20' : ''}`}>
                            <TableCell className="p-2 pt-2.5">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className={`size-4 ${notification.read ? 'opacity-50 pointer-events-none' : ''}`}
                                                onClick={() => handleMarkAsRead(notification.notificationClass, notification.id)}>
                                            <Eye className="text-primary"/>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="z-[1003]">
                                        <p>Make read</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TableCell>
                            <TableCell className="p-2 font-medium">
                                {notification.title}
                            </TableCell>
                            <TableCell className="p-2 whitespace-break-spaces">
                                <div className="max-w-[500px] whitespace-break-spaces">
                                    {notification.message}
                                </div>
                            </TableCell>
                            <TableCell className="p-2">
                                {new Date(notification.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell className="p-2">
                                {notification.metadata?.changes &&
                                    <Button variant="green" size="sm" onClick={() => {
                                        setDiffItem(notification.metadata?.changes)
                                        setDelOpen(true)
                                    }}>
                                        <Braces/>
                                    </Button>
                                }
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Dialog open={delOpen} onOpenChange={(open) => {
                setDelOpen(open)
                if (!open) {
                    setTimeout(() => {
                        document.body.removeAttribute('style')
                    }, 300)
                }
            }}>
                <DialogContent className="z-[1022] sm:max-w-[60vw]">
                    <DialogHeader>
                        <DialogTitle>Diff</DialogTitle>
                    </DialogHeader>
                    <DiffViewer changes={diffItem as DiffChanges[]} className="max-h-[80vh] overflow-auto sm:max-w-[60vw] w-full"/>
                </DialogContent>
            </Dialog>
        </div>
    );
}
export default System;