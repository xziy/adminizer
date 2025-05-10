import {Skeleton} from "@/components/ui/skeleton.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Switch} from "@/components/ui/switch.tsx";
import {
    DialogStack,
    DialogStackBody,
    DialogStackContent,
    DialogStackOverlay, DialogStackTitle,
    DialogStackTrigger
} from "@/components/ui/dialog-stack.tsx";
import MaterialIcon from "@/components/material-icon.tsx";
import {useCallback, useEffect, useMemo, useState} from "react";
import {Responsive, WidthProvider} from "react-grid-layout";
import {Widget, WidgetLayoutItem} from "@/types";
import {initializeWidgets} from "@/lib/widgets-service.ts";
import axios from "axios";
import AddWidgets from "@/components/widgets/add-widgets.tsx";
import WidgetItem from "@/components/widgets/widget-item.tsx";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";


const WidgetLayout = () => {
    const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);
    const [layout, setLayout] = useState<WidgetLayoutItem[]>([]);
    const [widgets, setWidgets] = useState<Widget[]>([])
    const [popUpDisabled, setPopUpDisabled] = useState(false)
    const [keyRender, setKeyRender] = useState(0);
    const [loading, setIsLoading] = useState(true)
    const [isDraggable, setIsDraggable] = useState(false)

    useEffect(() => {
        async function loadWidgets() {
            try {
                const {layout: widgetsLayout, widgets: widgetsData} = await initializeWidgets();
                setWidgets(widgetsData)
                setLayout(widgetsLayout)
            } catch (error) {
                console.error('Failed to load widgets:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadWidgets();
    }, []);

    const switchDraggable = useCallback((value: boolean) => {
        setIsDraggable(value)
        if (!value) {
            addWidgetsDB(widgets, layout).then(() => {
                setTimeout(() => {
                    setPopUpDisabled(false);
                }, 300)
            })
        }
    }, [layout, isDraggable])

    const handleLayoutChange = (currentLayout: WidgetLayoutItem[]) => {

        const mergeCoordinates = (layout: WidgetLayoutItem[], currentLayout: WidgetLayoutItem[]) => {
            // Создаем копию первого массива, чтобы не изменять оригинал
            const result = JSON.parse(JSON.stringify(layout));

            // Создаем карту для быстрого поиска элементов по полю 'i'
            const secondMap = new Map();
            currentLayout.forEach(item => secondMap.set(item.i, item));

            // Обновляем координаты в первом массиве
            result.forEach((item: WidgetLayoutItem) => {
                const secondItem = secondMap.get(item.i);
                if (secondItem) {
                    item.x = secondItem.x;
                    item.y = secondItem.y;
                }
            });

            return result;
        }
        setLayout(mergeCoordinates(layout, currentLayout))
    };

    const addWidgets = useCallback((id: string) => {
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

        addWidgetsDB(updatedWidgets, newLayout).then(() => {
            setTimeout(() => {
                setPopUpDisabled(false);
            }, 300)
        })

    }, [layout, widgets]);

    const addWidgetsDB = useCallback(async (updatedWidgets: Widget[], newLayout: WidgetLayoutItem[]) => {
        try {
            await axios.post(`${window.routePrefix}/widgets-get-all-db`, {
                widgets: updatedWidgets.filter(widget => widget.added === true),
                layout: newLayout
            });
        } catch (e) {
            console.log(e);
        }
    }, [widgets])
    return (
        <div
            className={`flex h-full flex-1 flex-col gap-4 rounded-xl p-4 `}>
            {loading ? (
                <div>
                    <Skeleton className="h-8 w-full rounded-md"/>
                    <div className="flex flex-wrap mt-8 gap-6">
                        <Skeleton className="h-20 w-40 rounded-md"/>
                        <Skeleton className="h-30 w-80 rounded-md"/>
                        <Skeleton className="h-40 w-50 rounded-md"/>
                        <Skeleton className="h-40 w-50 rounded-md"/>
                        <Skeleton className="h-24 w-60 rounded-md"/>
                        <Skeleton className="h-32 w-70 rounded-md"/>
                        <Skeleton className="h-28 w-45 rounded-md"/>
                    </div>
                </div>
            ) : (
                <>
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

                            <Switch className="cursor-pointer" checked={isDraggable} onCheckedChange={switchDraggable}/>

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
                                onLayoutChange={handleLayoutChange}
                                isResizable={false}
                                isDraggable={isDraggable}
                                key={keyRender}
                                className="overflow-hidden"
                            >
                                {layout.map((widget) => (
                                    <div key={widget.i}>
                                        <WidgetItem draggable={isDraggable} widgets={widgets} ID={widget.id}/>
                                    </div>
                                ))}
                            </ResponsiveGridLayout>
                        ) : (
                            <p className="text-center mt-8 text-muted-foreground">You don't have any widgets
                                selected
                                yet.
                                You can add them by clicking on the plus sign at the
                                top
                                right.</p>
                        )}
                    </div>
                </>
            )}

        </div>
    )
}

export default WidgetLayout
