import { FC, RefObject } from "react";
import { DialogStack, DialogStackBody, DialogStackContent, DialogStackOverlay } from "@/components/ui/dialog-stack.tsx";
import HistoryList from "@/components/history/HistoryList";

interface HistoryDialogStackProps {
    dialogRef: RefObject<any>
    modelId: string | number
    modelName: string
}

const HistoryDialogStack: FC<HistoryDialogStackProps> = ({ dialogRef, modelId, modelName }) => {
    return (
        <DialogStack ref={dialogRef}>
            <DialogStackOverlay />
            <DialogStackBody>
                <DialogStackContent>
                    <HistoryList modelId={modelId} modelName={modelName} />
                </DialogStackContent>
            </DialogStackBody>
        </DialogStack>
    )
}

export default HistoryDialogStack