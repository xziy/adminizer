import React from "react";
import {DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay} from "@/components/ui/dialog-stack.tsx";
import DropZone from "@/components/media-manager/DropZone.tsx";

interface MediaDialogStackProps {
    dialogRef: React.RefObject<any>;
}

const MediaDialogStack: React.FC<MediaDialogStackProps> = ({dialogRef}) => {
    return (
        <DialogStack ref={dialogRef}>
            <DialogStackOverlay/>
            <DialogStackBody>
                <DialogStackContent>
                    <div className="relative h-full">
                        <div className="h-full overflow-y-auto mt-5">
                            <DropZone />
                        </div>
                    </div>
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    )
}

export default MediaDialogStack