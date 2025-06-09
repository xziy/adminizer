import {Button} from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogClose,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {Trash2} from 'lucide-react';
import {Icon} from "@/components/icon.tsx";
import {Link} from "@inertiajs/react";
import {cn} from "@/lib/utils"

interface DeleteModalProps {
    btnTitle: string,
    link?: string,
    handleDelete?: () => void,
    isLink?: boolean,
    delModal: {
        yes: string,
        no: string
        text: string
    }
    variant?: "link" | "default" | "destructive" | "green" | "outline" | "secondary" | "ghost" | null | undefined
    btnCLass?: string
}

export default function DeleteModal({
                                        btnTitle,
                                        link,
                                        delModal,
                                        handleDelete,
                                        variant,
                                        btnCLass,
                                        isLink = true
                                    }: DeleteModalProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="list" variant={variant ?? "ghost"}
                        className={cn(
                            "cursor-pointer",
                            btnCLass
                        )}>
                    <Icon iconNode={Trash2}/>
                    {btnTitle}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Delete</DialogTitle>
                    <div className="mt-2 text-base">
                        {delModal.text}
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        {isLink ? (
                            <Button variant="destructive" asChild>
                                <Link href={link ?? '#'}>
                                    {delModal.yes}
                                </Link>
                            </Button>
                        ) : (
                            <Button variant="destructive" asChild onClick={handleDelete}>
                                <span>{delModal.yes}</span>
                            </Button>
                        )}
                    </DialogClose>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">{delModal.no}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
