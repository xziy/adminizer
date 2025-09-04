import {INotification, DiffChanges} from "../../../../interfaces/types.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Eye, Trash2} from "lucide-react";
import {useState} from "react";
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog.tsx";
import {DiffViewer} from "@/components/notifications/DiffViewer.tsx";

interface SystemProps {
    notifications: INotification[]
}

const System = ({notifications}: SystemProps) => {
    const [delOPen, setDelOpen] = useState(false);
    const [diffItem, setDiffItem] = useState<INotification['metadata'] | null>(null);

    return (
        <div>
            <Table wrapperHeight="max-h-[75vh]">
                <TableHeader className="sticky top-0 bg-background shadow">
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
                        <TableRow key={notification.id} className={`${!notification.read ? 'bg-muted/50' : ''}`}>
                            <TableCell className="p-2 align-top pt-2.5">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-4"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                }}>
                                            <Eye/>
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
                            <TableCell className="p-2 align-top">
                                {notification.metadata?.changes &&
                                    <Button variant="destructive" onClick={() => {
                                        setDiffItem(notification.metadata?.changes)
                                        setDelOpen(true)
                                    }}>
                                        <Trash2/>
                                    </Button>
                                }
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <Dialog open={delOPen} onOpenChange={(open) => {
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
    )
}
export default System