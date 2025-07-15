import {DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay} from "@/components/ui/dialog-stack.tsx";
import DropZone from "@/components/media-manager/DropZone.tsx";
import {FC, RefObject, useContext, useEffect, useRef, useState} from "react";
import Gallery, {GalleryRef} from "@/components/media-manager/Gallery.tsx";
import MediaMetaForm from "@/components/media-manager/MediaMeta.tsx";
import {Media} from "@/types";
import axios from "axios";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";

interface MediaDialogStackProps {
    dialogRef: RefObject<any>;
}

const MediaDialogStack: FC<MediaDialogStackProps> = ({dialogRef}) => {
    const galleryRef = useRef<GalleryRef>(null);
    const [media, setMedia] = useState<Media | null>(null);
    const [messages, setMessages] = useState<Record<string, string>>({})
    const {uploadUrl} = useContext(MediaManagerContext);

    const openMeta = (media: Media) => {
        setMedia(media);
        dialogRef.current?.next()
    }

    useEffect(() => {
        const initLocales = async () => {
            let res = await axios.post(`${uploadUrl}`, {
                _method: 'getLocales'
            });
            // console.log(res.data.data)
            setMessages(res.data.data);
        };

        initLocales();
    }, []);
    return (
        <DialogStack ref={dialogRef}>
            <DialogStackOverlay/>
            <DialogStackBody>
                <DialogStackContent>
                    <div className="relative h-full">
                        <div className="h-full overflow-y-auto mt-5 pr-5">
                            <DropZone galleryRef={galleryRef as RefObject<GalleryRef>} messages={messages}/>
                            <Gallery ref={galleryRef} openMeta={openMeta} messages={messages}/>
                        </div>
                    </div>
                </DialogStackContent>
                <DialogStackContent>
                    <div className="relative h-full">
                        <div className="h-full overflow-y-auto mt-5 pr-5">
                            {media && <MediaMetaForm media={media} callback={() => {
                                setMedia(null);
                                dialogRef.current?.prev()
                            }}/>}
                        </div>
                    </div>
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    )
}

export default MediaDialogStack