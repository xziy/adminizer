import {useRef, useState, createContext, useCallback} from 'react';
import {
    closestCenter,
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    useDndContext,
    MeasuringStrategy,
    DropAnimation,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import type {
    DragStartEvent,
    DragEndEvent,
    MeasuringConfiguration,
    UniqueIdentifier,
} from '@dnd-kit/core';
import {
    arrayMove,
    useSortable,
    SortableContext,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {CSS, isKeyboardEvent} from '@dnd-kit/utilities';

import {Item, Layout, Position} from './Item.tsx';
import type {Props as PageProps} from './Item.tsx';
import styles from './Manager.module.css';
import pageStyles from './Item.module.css';
import {cn} from "@/lib/utils.ts";
import {Button} from "@/components/ui/button.tsx";
import {Grid2x2Plus} from "lucide-react";
import {DialogStackHandle} from "@/components/ui/dialog-stack.tsx";
import MediaDialogStack from "@/components/media-manager/components/MediaDialogStack.tsx";
import {Media} from "@/types";

interface Props {
    layout: Layout;
    config: {
        id: string
        group: string
    }
    onChange?: (media: Media[]) => void
    value?: Media[]
}

type MediaManagerContextType = {
    uploadUrl: string
    config?: Record<string, any>
    managerId: string
    group: string
    addMedia: (media: Media) => void
    removeMedia: (media: Media) => void
    imageUrl: (media: Media) => string
    checkMedia: (media: Media) => boolean
    onChange?: (media: Media[]) => void
}

export const MediaManagerContext = createContext<MediaManagerContextType>({
    uploadUrl: '',
    config: {},
    managerId: '',
    group: '',
    addMedia: (_media) => console.warn('addMedia not implemented'),
    removeMedia: (_media: Media) => console.warn('removeMedia not implemented'),
    imageUrl: (_media: Media) => {
        return ''
    },
    checkMedia: (_media: Media) => {
        return false
    },
});

const measuring: MeasuringConfiguration = {
    droppable: {
        strategy: MeasuringStrategy.Always,
    },
};

const dropAnimation: DropAnimation = {
    keyframes({transform}) {
        return [
            {transform: CSS.Transform.toString(transform.initial)},
            {
                transform: CSS.Transform.toString({
                    scaleX: 0.98,
                    scaleY: 0.98,
                    x: transform.final.x - 10,
                    y: transform.final.y - 10,
                }),
            },
        ];
    },
    sideEffects: defaultDropAnimationSideEffects({
        className: {
            active: pageStyles.active,
        },
    }),
};

const MediaManager = ({layout, config, onChange, value}: Props ) => {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
    const [items, setItems] = useState<Media[]>(value || []);
    const activeIndex = activeId !== null ? items.findIndex(item => item.id === activeId) : -1;
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {coordinateGetter: sortableKeyboardCoordinates})
    );

    const addMediaWithCallback  = useCallback((newMedia: Media) => {
        setItems((prev) => {
            const newItems = [...prev, newMedia];
            if (onChange) onChange(newItems);
            return newItems
        })

    }, [onChange]);

    const removeMediaWithCallback = useCallback((media: Media) => {
        setItems(prev => {
            const newItems = prev.filter(item => item.id !== media.id);
            if (onChange) onChange(newItems);
            return newItems;
        });
    }, [onChange]);

    const contextValue: MediaManagerContextType = {
        uploadUrl: `${window.routePrefix}/media-manager-uploader/${config.id ? config.id : 'default'}`,
        managerId: config.id,
        group: config.group,
        config: {},
        addMedia: (media) => addMediaWithCallback (media),
        removeMedia: (media) => removeMediaWithCallback(media),
        imageUrl: (media: Media) => {
            if (media.mimeType && media.mimeType.split("/")[0] === 'image') {
                return `${window.routePrefix}/get-thumbs?id=${media.id}&managerId=${config.id}`;
            } else {
                const fileName = media.url.split(/[#?]/)[0];
                const parts = fileName.split(".");
                const extension = parts.pop()?.toLowerCase().trim();
                return `${window.routePrefix}/fileicons/${extension}.svg`;
            }
        },
        checkMedia: (media: Media) => {
            return items.some((e) => e.id === media.id);
        }
    };

    const dialogRef = useRef<DialogStackHandle>(null);

    const activeMedia = activeId ? items.find(item => item.id === activeId) : null;

    const handleDragStart = ({active}: DragStartEvent) => {
        setActiveId(active.id);
    }

    const handleDragCancel = () => {
        setActiveId(null);
    }

    const handleDragEnd = ({over}: DragEndEvent) => {
        if (!over || activeIndex === -1) {
            setActiveId(null);
            return;
        }

        const overIndex = items.findIndex(item => item.id === over.id);
        if (overIndex !== -1 && activeIndex !== overIndex) {
            setItems(prev => {
                const newItems = arrayMove(prev, activeIndex, overIndex);
                if (onChange) onChange(newItems);
                return newItems;
            });
        }

        setActiveId(null);
    }
    return (
        <MediaManagerContext.Provider value={contextValue}>
            <div>
                <Button size="icon" variant="ghost" onClick={(e) => {
                    e.preventDefault()
                    dialogRef.current?.open()
                }}>
                    <Grid2x2Plus className="size-7 text-chart-2"/>
                </Button>
                <DndContext
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    measuring={measuring}
                >
                    <SortableContext items={items.map(item => item.id)}>
                        <ul className={cn(styles.Pages, styles[layout])}>
                            {items.map((media, index) => (
                                <SortablePage
                                    id={media.id}
                                    key={media.id}
                                    index={index}
                                    url={contextValue.imageUrl(media)}
                                    layout={layout}
                                    activeIndex={activeIndex}
                                    onRemove={() => setItems(prev => prev.filter(m => m.id !== media.id))}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId != null ? (
                            <PageOverlay
                                id={activeId}
                                layout={layout}
                                items={items}
                                url={activeMedia ? contextValue.imageUrl(activeMedia) : ''}
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
                <MediaDialogStack dialogRef={dialogRef}/>
            </div>
        </MediaManagerContext.Provider>
    );
}

function PageOverlay({
                         id,
                         items,
                         ...props
                     }: Omit<PageProps, 'index'> & { items: Media[] }) {
    const {activatorEvent, over} = useDndContext();
    const isKeyboardSorting = isKeyboardEvent(activatorEvent);

    const activeIndex = items.findIndex(item => item.id === id);

    const overIndex = over?.id ? items.findIndex(item => item.id === over.id) : -1;

    return (
        <Item
            id={id}
            {...props}
            clone
            insertPosition={
                isKeyboardSorting && overIndex !== activeIndex
                    ? overIndex > activeIndex
                        ? Position.After
                        : Position.Before
                    : undefined
            }
        />
    );
}

function SortablePage({
                          id,
                          index,
                          activeIndex,
                          ...props
                      }: PageProps & { index: number; activeIndex: number }) {
    const {
        attributes,
        listeners,
        isDragging,
        isSorting,
        over,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id,
        animateLayoutChanges: always,
        data: {
            index,
        },
    });

    return (
        <Item
            ref={setNodeRef}
            id={id}
            index={index}
            active={isDragging}
            style={{
                transition,
                transform: isSorting ? undefined : CSS.Translate.toString(transform),
            }}
            insertPosition={
                over?.id === id
                    ? index > activeIndex
                        ? Position.After
                        : Position.Before
                    : undefined
            }
            {...props}
            {...attributes}
            {...listeners}
        />
    );
}

function always() {
    return true;
}

export default MediaManager;