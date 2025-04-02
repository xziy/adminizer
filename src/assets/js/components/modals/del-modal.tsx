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

interface DeleteModalProps {
    btnTitle: string,
    link: string,
    delModal: {
        yes: string,
        no: string
        text: string
    }
}

export default function DeleteModal({btnTitle, link, delModal}: DeleteModalProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button size="list" variant="ghost"
                        className="font-normal text-destructive hover:text-destructive w-full cursor-pointer justify-start">
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
                        <Button variant="destructive" asChild>
                            <Link href={link}>
                                {delModal.yes}
                            </Link>
                        </Button>
                    </DialogClose>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">{delModal.no}</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
