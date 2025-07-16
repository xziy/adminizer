import {DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay} from "@/components/ui/dialog-stack.tsx";
import DropZone from "@/components/media-manager/DropZone.tsx";
import {FC, RefObject, useContext, useEffect, useRef, useState} from "react";
import Gallery, {GalleryRef} from "@/components/media-manager/Gallery.tsx";
import MediaMetaForm from "@/components/media-manager/MediaMeta.tsx";
import {Media} from "@/types";
import axios from "axios";
import {MediaManagerContext} from "@/components/media-manager/media-manager.tsx";
import ImageCropper from "@/components/media-manager/ImageCropper.tsx";
import MediaVariants from "@/components/media-manager/MediaVariants.tsx";

interface MediaDialogStackProps {
    dialogRef: RefObject<any>;
}

const MediaDialogStack: FC<MediaDialogStackProps> = ({dialogRef}) => {
    const galleryRef = useRef<GalleryRef>(null);
    const [media, setMedia] = useState<Media | null>(null);
    const [messages, setMessages] = useState<Record<string, string>>({})
    const {uploadUrl, group} = useContext(MediaManagerContext);
    const [popupType, setPopupType] = useState<string>('');


    const openMeta = (media: Media) => {
        setMedia(media);
        setPopupType('meta');
        dialogRef.current?.next()
    }

    const crop = (media: Media) => {
        setMedia(media)
        setPopupType('crop');
        dialogRef.current?.next()
    }

    const openVariant = (media: Media) => {
        setMedia(media)
        setPopupType('variant')
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
                            <DropZone
                                key="main-dropzone"
                                messages={messages}
                                callback={(media) => {
                                    galleryRef.current?.pushMediaItem(media)
                                }}
                            />
                            <Gallery
                                ref={galleryRef}
                                openMeta={openMeta}
                                messages={messages}
                                crop={crop}
                                openVariant={openVariant}
                            />
                        </div>
                    </div>
                </DialogStackContent>
                <DialogStackContent>
                    <div className="relative h-full">
                        <div className="h-full overflow-y-auto mt-5 pr-5">
                            {popupType === 'meta' &&
                                media &&
                                <MediaMetaForm media={media} callback={() => {
                                    setMedia(null);
                                    dialogRef.current?.prev()
                                }}/>
                            }
                            {popupType === 'crop' &&
                                media &&
                                <ImageCropper
                                    item={media}
                                    messages={messages}
                                    callback={(media, newVariant) => {
                                        galleryRef.current?.addVariant(media, newVariant);
                                        dialogRef.current?.prev()
                                    }}
                                    uploadUrl={uploadUrl} group={group}/>
                            }
                            {popupType === 'variant' &&
                                media &&
                                <MediaVariants media={media} messages={messages}/>
                            }
                        </div>
                    </div>
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    )
}

export default MediaDialogStack