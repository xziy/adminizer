import {useContext} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {Media} from "@/types";
import {cn} from "@/lib/utils.ts";
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu.tsx";

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
}

const Image = ({media, className, messages, openMeta}: ImageProps) => {
    const {managerId} = useContext(MediaManagerContext);

    const imageUrl = (media: Media) => {
        if (media.mimeType && media.mimeType.split("/")[0] === 'image') {
            return `${window.routePrefix}/get-thumbs?id=${media.id}&managerId=${managerId}`;
        } else {
            const fileName = media.url.split(/[#?]/)[0];
            const parts = fileName.split(".");
            const extension = parts.pop()?.toLowerCase().trim();
            return `${window.routePrefix}/fileicons/${extension}.svg`;
        }
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <img className={cn('w-full h-full', className)} src={imageUrl((media))} alt=""/>
            </ContextMenuTrigger>
            <ContextMenuContent className="z-[1005]">
                <ContextMenuItem onClick={()=> openMeta(media)}>
                    {messages["Meta data"]}
                </ContextMenuItem>
                <ContextMenuItem>
                    {messages["View"]}
                </ContextMenuItem>
                <ContextMenuItem>
                    {messages["Crop"]}
                </ContextMenuItem>
                <ContextMenuItem>
                    {messages["Variants"]}
                </ContextMenuItem>
                <ContextMenuItem>
                    {messages["Delete"]}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

export default Image