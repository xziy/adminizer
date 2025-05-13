// TODO move to documentation
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent, DialogStackDescription, DialogStackNext,
    DialogStackOverlay, DialogStackPrevious, DialogStackTitle,
    DialogStackTrigger
} from "@/components/ui/dialog-stack.tsx";
import {Button} from "@/components/ui/button.tsx";

export default function PopUpExample() {
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            Dashboard

            <DialogStack>
                <DialogStackTrigger asChild>
                    <Button variant="outline">Open</Button>
                </DialogStackTrigger>

                <DialogStackOverlay/>

                <DialogStackBody>
                    <DialogStackContent>
                        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                            <DialogStackTitle className="font-semibold text-lg leading-none tracking-tight">
                                I'm the first dialog
                            </DialogStackTitle>
                            <DialogStackDescription className="text-muted-foreground text-sm">
                                With a fancy description
                            </DialogStackDescription>
                        </div>
                        <div className="flex items-center space-x-2 pt-4 justify-end">
                            <DialogStackNext asChild>
                                <Button variant="outline">Next</Button>
                            </DialogStackNext>
                        </div>
                    </DialogStackContent>

                    <DialogStackContent>
                        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                            <DialogStackTitle className="font-semibold text-lg leading-none tracking-tight">
                                I'm the second dialog
                            </DialogStackTitle>
                            <DialogStackDescription className="text-muted-foreground text-sm">
                                With a fancy description
                            </DialogStackDescription>
                        </div>
                        <div className="flex items-center space-x-2 pt-4 justify-between">
                            <DialogStackPrevious asChild>
                                <Button variant="outline">Previous</Button>
                            </DialogStackPrevious>
                            <DialogStackNext asChild>
                                <Button variant="outline">Next</Button>
                            </DialogStackNext>
                        </div>
                    </DialogStackContent>

                    <DialogStackContent>
                        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                            <DialogStackTitle className="font-semibold text-lg leading-none tracking-tight">
                                I'm the final dialog
                            </DialogStackTitle>
                            <DialogStackDescription className="text-muted-foreground text-sm">
                                With a fancy description
                            </DialogStackDescription>
                        </div>
                        <div className="flex items-center space-x-2 pt-4 justify-start">
                            <DialogStackPrevious asChild>
                                <Button variant="outline">Previous</Button>
                            </DialogStackPrevious>
                        </div>
                    </DialogStackContent>
                </DialogStackBody>
            </DialogStack>
        </div>
    );
}
