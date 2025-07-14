import {DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay} from "@/components/ui/dialog-stack.tsx";
import DropZone from "@/components/media-manager/DropZone.tsx";
import {FC, RefObject, useRef, useState} from "react";
import Gallery, {GalleryRef} from "@/components/media-manager/Gallery.tsx";
import MediaMetaForm from "@/components/media-manager/MediaMeta.tsx";
import { Media } from "@/types";

interface MediaDialogStackProps {
    dialogRef: RefObject<any>;
}

const MediaDialogStack: FC<MediaDialogStackProps> = ({dialogRef}) => {
    const galleryRef = useRef<GalleryRef>(null);
    const [media, setMedia] = useState<Media>(null);
    const openMeta = (media: Media) => {
        setMedia(media);
        dialogRef.current?.next()
    }
    return (
        <DialogStack ref={dialogRef}>
            <DialogStackOverlay/>
            <DialogStackBody>
                <DialogStackContent>
                    <div className="relative h-full">
                        <div className="h-full overflow-y-auto mt-5 pr-5">
                            <DropZone galleryRef={galleryRef as RefObject<GalleryRef>} />
                            <Gallery ref={galleryRef} openMeta={openMeta}/>
                        </div>
                    </div>
                </DialogStackContent>
                <DialogStackContent>
                    <div className="relative h-full">
                        <div className="h-full overflow-y-auto mt-5 pr-5">
                            <MediaMetaForm media={media as Media}/>
                        </div>
                    </div>
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    )
}

export default MediaDialogStack