import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, Widget, WidgetLayoutItem} from '@/types';
import {Responsive, WidthProvider} from "react-grid-layout";
import {Switch} from "@/components/ui/switch"

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {useEffect, useMemo, useState} from "react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {initializeWidgets} from "@/lib/widgets-service.ts";
import {
    DialogStack, DialogStackBody,
    DialogStackContent, DialogStackDescription,
    DialogStackOverlay,
    DialogStackTitle,
    DialogStackTrigger
} from "@/components/ui/dialog-stack.tsx";
import AddWidgets from "@/components/add-widgets.tsx";

const breadcrumbs: BreadcrumbItem[] = [];

const initialLayout: WidgetLayoutItem[] = [
    {x: 0, y: 0, w: 1, h: 1, i: "1111", id: "1"},
    {x: 1, y: 0, w: 2, h: 1, i: "2222", id: "2"},
    {x: 4, y: 0, w: 1, h: 2, i: "3333", id: "3"},
];

export default function Dashboard() {
    const [layout, setLayout] = useState(initialLayout);
    const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);
    const [widgets, setWidgets] = useState<Widget[]>([])

    useEffect(() => {
        async function loadWidgets() {
            try {
                const {layout: widgetsLayout, widgets: widgetsData} = await initializeWidgets();
                setWidgets(widgetsData)
                // console.log(widgetsLayout, widgetsData)
                // setLayout(widgetsLayout);
            } catch (error) {
                // console.error('Failed to load widgets:', error);
                // // Можно установить fallback layout или показать ошибку
                // setLayout([
                //     { x: 0, y: 0, w: 1, h: 1, i: "1111", id: "fallback1" },
                //     { x: 1, y: 0, w: 2, h: 1, i: "2222", id: "fallback2" },
                //     { x: 4, y: 0, w: 1, h: 2, i: "3333", id: "fallback3" },
                // ]);
            } finally {
                // setIsLoading(false);
            }
        }

        loadWidgets();
    }, []);

    const handleLayoutChange = (currentLayout: any) => {
        setLayout(currentLayout);
        console.log("Updated layout:", currentLayout);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex justify-between items-center mr-16">
                    <h1 className="font-bold text-xl">Quick actions</h1>
                    <div className="flex gap-4 items-center">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline"
                                            className="rounded-full !p-2 size-6 cursor-pointer">?</Button>
                                </TooltipTrigger>
                                <TooltipContent align="end" side="bottom">
                                    <p>Add to library</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Switch className="cursor-pointer"/>

                        <DialogStack>
                            <DialogStackTrigger asChild>
                                <Button variant="ghost" size="icon" className="cursor-pointer">
                                    <MaterialIcon name="add_box" className="text-primary"/>
                                </Button>
                            </DialogStackTrigger>
                            <DialogStackOverlay/>
                            <DialogStackBody>
                                <DialogStackContent>
                                    <div className="h-full">
                                        <DialogStackTitle
                                            className="font-bold leading-none tracking-tight py-4 mr-8 sticky border-b text-xl">
                                            Widget Settings
                                        </DialogStackTitle>
                                        <div className="overflow-auto h-[calc(100%-64px)] pr-4 pt-4">
                                            <AddWidgets initWidgets={widgets}/>
                                        </div>
                                    </div>
                                </DialogStackContent>
                            </DialogStackBody>
                        </DialogStack>
                    </div>
                </div>
                <div>
                    <ResponsiveGridLayout
                        layouts={{lg: layout}}
                        breakpoints={{lg: 1024, md: 768, sm: 475, xs: 320, xxs: 0}}
                        cols={{lg: 8, md: 6, sm: 4, xs: 2, xxs: 2}}
                        rowHeight={131}
                        onLayoutChange={handleLayoutChange}
                        isResizable={false}
                        isDraggable={false}
                    >
                        {layout.map((widget) => (
                            <div key={widget.i} className="block" style={{background: "#f0f0f0"}}
                                 onClick={() => console.log(`Clicked on ${widget.id}`)}>
                                {widget.id}
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                </div>
            </div>
        </AppLayout>
    );
}
