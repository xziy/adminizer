import {useContext} from "react";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import {Media} from "@/types";
import {cn} from "@/lib/utils.ts";

const imagesTypes = new Set([
    "image/gif",
    "image/jpeg",
    "image/png",
    "image/webp",
]);

interface ImageProps {
    media: Media,
    className?: string
}

const Image = ({media, className}: ImageProps) => {
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
    return(
        <div>
            <img className={cn('w-full h-full', className)} src={imageUrl((media))} alt=""/>
        </div>
    )
}

export default Image