import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem, Widget, WidgetLayoutItem} from '@/types';
import {Responsive, WidthProvider} from "react-grid-layout";
import {Switch} from "@/components/ui/switch"
import axios from 'axios';
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {useCallback, useEffect, useMemo, useState} from "react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {initializeWidgets} from "@/lib/widgets-service.ts";
import {
    DialogStack, DialogStackBody,
    DialogStackContent,
    DialogStackOverlay,
    DialogStackTitle,
    DialogStackTrigger
} from "@/components/ui/dialog-stack.tsx";
import AddWidgets from "@/components/add-widgets.tsx";

const breadcrumbs: BreadcrumbItem[] = [];


export default function Dashboard() {
    const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);
    const [layout, setLayout] = useState<WidgetLayoutItem[]>([]);
    const [widgets, setWidgets] = useState<Widget[]>([])
    const [popUpDisabled, setPopUpDisabled] = useState(false)
    const [keyRender, setKeyRender] = useState(0);

    useEffect(() => {
        async function loadWidgets() {
            try {
                const {layout: widgetsLayout, widgets: widgetsData} = await initializeWidgets();
                setWidgets(widgetsData)
                setLayout(widgetsLayout)
            } catch (error) {
                console.error('Failed to load widgets:', error);
            } finally {
                // setIsLoading(false);
            }
        }

        loadWidgets();
    }, []);


    // const handleLayoutChange = (currentLayout: any) => {
    //     setLayout(currentLayout);
    //     console.log("Updated layout:", currentLayout);
    // };

    const addWidgets = useCallback( (id: string) => {
        setPopUpDisabled(true);

        const updatedWidgets = widgets.map(widget =>
            widget.id === id
                ? {...widget, added: !widget.added}
                : widget
        );

        const layoutItem = layout.find(e => e.id === id);
        let newLayout: WidgetLayoutItem[];

        if (layoutItem) {
            newLayout = layout.filter(e => e.id !== id);
        } else {
            const widget = widgets.find(e => e.id === id);
            const w = widget?.size ? widget.size.w : 1;
            const h = widget?.size ? widget.size.h : 1;

            let x = layout.length === 0
                ? 0
                : ((layout[layout.length - 1].x + layout[layout.length - 1].w) > 8 ||
                (layout[layout.length - 1].x + layout[layout.length - 1].w + w) > 8
                    ? 0
                    : (layout[layout.length - 1].x + layout[layout.length - 1].w));

            const y = 0;

            newLayout = [
                ...layout,
                {
                    x: x,
                    y: y,
                    w: w,
                    h: h,
                    i: String(layout.length + 1),
                    id: widget?.id as string,
                }
            ];
        }

        setWidgets(updatedWidgets);
        setLayout(newLayout);
        setKeyRender(prev => prev + 1);

        addWidgetsDB(updatedWidgets)

    }, [layout, widgets]);

    const addWidgetsDB = useCallback( async (updatedWidgets: Widget[]) => {
        try {
            const res = await axios.post(`${window.routePrefix}/widgets-get-all-db`, {
                widgets: updatedWidgets.filter(widget => widget.added === true)
            });
            setPopUpDisabled(false);
            console.log(res.data);
        } catch (e) {
            console.log(e);
        }
    }, [widgets])

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
                                            <AddWidgets initWidgets={widgets} onAddWidgets={addWidgets}
                                                        disabled={popUpDisabled}/>
                                        </div>
                                    </div>
                                </DialogStackContent>
                            </DialogStackBody>
                        </DialogStack>
                    </div>
                </div>
                <div>
                    {layout.length > 0 ? (
                        <ResponsiveGridLayout
                            layouts={{lg: layout}}
                            breakpoints={{lg: 1024, md: 768, sm: 475, xs: 320, xxs: 0}}
                            cols={{lg: 8, md: 6, sm: 4, xs: 2, xxs: 2}}
                            rowHeight={131}
                            // onLayoutChange={handleLayoutChange}
                            isResizable={false}
                            isDraggable={false}
                            key={keyRender}
                        >
                            {layout.map((widget) => (
                                <div key={widget.i} className="block" style={{background: "#f0f0f0"}}
                                     onClick={() => console.log(`Clicked on ${widget.id}`)}>
                                    {widget.id}
                                </div>
                            ))}
                        </ResponsiveGridLayout>
                    ) : (
                        <p className="text-center mt-8 text-muted-foreground">You don't have any widgets selected yet.
                            You can add them by clicking on the plus sign at the
                            top
                            right.</p>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
