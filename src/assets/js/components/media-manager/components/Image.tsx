import {useContext, useState} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {Media} from "@/types";
import {cn} from "@/lib/utils.ts";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu.tsx";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog.tsx";
import {Button} from "@/components/ui/button.tsx";
import axios from "axios";

const imagesTypes = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

interface ImageProps {
    media: Media,
    className?: string
    messages: Record<string, string>
    openMeta: (media: Media) => void
    crop: (media: Media) => void
    openVariant: (media: Media) => void
    destroy: (media: Media) => void
}

const Image = ({media, className, messages, openMeta, crop, openVariant, destroy}: ImageProps) => {
    const {managerId, uploadUrl} = useContext(MediaManagerContext);
    const [delOPen, setDelOpen] = useState(false);

    const imageUrl = () => {
        if (media.mimeType && media.mimeType.split("/")[0] === 'image') {
            return `${window.routePrefix}/get-thumbs?id=${media.id}&managerId=${managerId}`;
        } else {
            const fileName = media.url.split(/[#?]/)[0];
            const parts = fileName.split(".");
            const extension = parts.pop()?.toLowerCase().trim();
            return `${window.routePrefix}/fileicons/${extension}.svg`;
        }
    }

    const openFile = () => {
        window.open(`/public${media.url}`, "_blank")?.focus();
    }

    const destroyItem = async () => {
        const res = await axios.delete(uploadUrl, {data: {item: media}});
        if (res.data.msg === "ok") destroy(media);
    }

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger>
                    <img className={cn('w-full h-full', className)} src={imageUrl()} alt=""/>
                </ContextMenuTrigger>
                <ContextMenuContent className="z-[1005]">
                    <ContextMenuItem onClick={() => openMeta(media)}>
                        {messages["Meta data"]}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => openFile()}>
                        {messages["View"]}
                    </ContextMenuItem>
                    {imagesTypes.has(media.mimeType) &&
                        <ContextMenuItem onClick={() => crop(media)}>
                            {messages["Crop"]}
                        </ContextMenuItem>
                    }
                    <ContextMenuItem onClick={() => openVariant(media)}>
                        {messages["Variants"]}
                    </ContextMenuItem>
                    <ContextMenuItem variant="destructive" onClick={() => setDelOpen(true)}>
                        {messages["Delete"]}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
            <Dialog open={delOPen} onOpenChange={(open) => {
                setDelOpen(open)
                if (!open) {
                    setTimeout(() => {
                        document.body.removeAttribute('style')
                    }, 300)
                }
            }}>
                <DialogContent className="z-[1022]">
                    <DialogHeader>
                        <DialogTitle>{messages["Delete"]}</DialogTitle>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="destructive" asChild onClick={destroyItem}>
                                <span>{messages["Yes"]}</span>
                            </Button>
                        </DialogClose>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">{messages["No"]}</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default Image