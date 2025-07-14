import {DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay} from "@/components/ui/dialog-stack.tsx";
import DropZone from "@/components/media-manager/DropZone.tsx";
import {FC, RefObject, useRef} from "react";
import Gallery, {GalleryRef} from "@/components/media-manager/Gallery.tsx";

interface MediaDialogStackProps {
    dialogRef: RefObject<any>;
}

const MediaDialogStack: FC<MediaDialogStackProps> = ({dialogRef}) => {
    const galleryRef = useRef<GalleryRef>(null);
    return (
        <DialogStack ref={dialogRef}>
            <DialogStackOverlay/>
            <DialogStackBody>
                <DialogStackContent>
                    <div className="relative h-full">
                        <div className="h-full overflow-y-auto mt-5 pr-5">
                            <DropZone galleryRef={galleryRef as RefObject<GalleryRef>} />
                            <Gallery ref={galleryRef} />
                        </div>
                    </div>
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    )
}

export default MediaDialogStack