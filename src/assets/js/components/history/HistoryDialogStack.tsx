import { FC, RefObject } from "react";
import { DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay } from "@/components/ui/dialog-stack.tsx";

interface HistoryDialogStackProps {
    dialogRef: RefObject<any>
}

const HistoryDialogStack: FC<HistoryDialogStackProps> = ({ dialogRef }) => {
    return (
        <DialogStack ref={dialogRef}>
            <DialogStackOverlay />
            <DialogStackBody>
                <DialogStackContent>
                    test
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    )
}

export default HistoryDialogStack