import {INotification} from "../../../../interfaces/types.ts";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Eye} from "lucide-react";

interface GeneralProps {
    notifications: INotification[]
}

const General = ({notifications}: GeneralProps) => {
    return (
        <Table wrapperHeight="max-h-[75vh]">
            <TableHeader className="sticky top-0 bg-background shadow">
                <TableRow>
                    <TableHead className="p-2 text-left"></TableHead>
                    <TableHead className="p-2 text-left">Title</TableHead>
                    <TableHead className="p-2 text-left">Message</TableHead>
                    <TableHead className="p-2 text-left">Date</TableHead>
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
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
export default General