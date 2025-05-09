import React, {useEffect, useRef, useState} from 'react';
import axios from "axios";
import {getDefaultColorByID} from "./colorPallete.ts";
import {Widget as WidgetData} from "@/types";
import MaterialIcon from "@/components/material-icon.tsx";
import {router} from "@inertiajs/react";

type WidgetType = 'info' | 'switcher' | 'action' | 'link' | 'custom';

interface WidgetProps {
    widgets: WidgetData[];
    draggable: boolean;
    ID: string;
}


const WidgetItem: React.FC<WidgetProps> = ({widgets, draggable, ID}) => {
    const [widgetState, setWidgetState] = useState<{
        name: string | null;
        info: string | null;
        description: string | null;
        icon: string;
        backgroundColor: string;
        type: WidgetType | null;
        state: boolean | null;
        constructorOption: any;
        constructorName: string | undefined;
    }>({
        name: null,
        info: null,
        description: null,
        icon: 'box',
        backgroundColor: '',
        type: null,
        state: null,
        constructorOption: null,
        constructorName: undefined,
    });

    const widgetRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const currentWidget = widgets.find((e) => e.id === ID);
        if (!currentWidget) return;

        setWidgetState((prev) => ({
            ...prev,
            name: currentWidget.name,
            description: currentWidget.description,
            icon: currentWidget.icon || 'widgets',
            backgroundColor: currentWidget.backgroundCSS || getDefaultColorByID(ID),
            type: currentWidget.type,
            constructorOption: currentWidget.constructorOption,
            constructorName: currentWidget.constructorName,
        }));

        if (currentWidget.type === 'info' && currentWidget.api) {
            getInfo(currentWidget.api);
        } else if (currentWidget.type === 'switcher' && currentWidget.api) {
            getState(currentWidget.api);
        } else if (currentWidget.type === 'custom') {
            // if (currentWidget.scriptUrl && currentWidget.constructorName) {
            //     runScript(currentWidget, currentWidget.constructorOption);
            // }
            if (currentWidget.hideAdminPanelUI) {
                setWidgetState((prev) => ({
                    ...prev,
                    icon: '',
                    name: '',
                    description: '',
                }));
            }
        }
    }, [widgets, ID]);

    const getInfo = async (api: string) => {
        try {
            const response = await axios.get(api);
            const info = response.data;
            setWidgetState((prev) => ({...prev, info}));
        } catch (error) {
            console.error('Error fetching widget info:', error);
        }
    };

    const getState = async (api: string) => {
        try {
            const response = await axios.get(api);
            const {state} = response.data;
            setWidgetState((prev) => ({...prev, state}));
        } catch (error) {
            console.error('Error fetching widget state:', error);
        }
    };

    const widgetAction = async () => {
        if (!widgetState.type || widgetState.type === 'info' || draggable) return;

        if (widgetState.type === 'link') {
            const widget = widgets.find((e) => e.id === ID);
            if (widget?.link) {
                if (widget?.linkType === 'self') {
                    router.visit(widget.link);
                } else {
                    window.open(widget.link, '_blank', 'noopener,noreferrer');
                }
            }
            return;
        }

        const widgetElement = widgetRef.current;
        if (!widgetElement) return;

        widgetElement.classList.add('widget--switching');

        const api = widgets.find((e) => e.id === ID)?.api;
        if (!api) return;

        try {
            switch (widgetState.type) {
                case 'switcher':
                    const switcherResponse = await axios.post(api);
                    const {state} = switcherResponse.data;
                    setWidgetState((prev) => ({...prev, state}));
                    break;
                case 'action':
                case 'custom':
                    const actionResponse = await axios.post(api);
                    const result = actionResponse.data;
                    console.log(result);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error('Error performing widget action:', error);
        } finally {
            widgetElement.classList.remove('widget--switching');
        }
    };

    // const runScript = (currentWidget: WidgetData, constructorOption: any) => {
    //     if (!currentWidget.scriptUrl || !currentWidget.constructorName) return;
    //
    //     const api = currentWidget.scriptUrl;
    //
    //     // Remove existing script if it exists
    //     const existingScript = document.querySelector(`script[src="${api}"]`);
    //     if (existingScript) {
    //         existingScript.parentNode?.removeChild(existingScript);
    //     }
    //
    //     const script = document.createElement('script');
    //     script.src = api;
    //     script.onload = () => {
    //         const containerElement = document.getElementById(ID);
    //         if (containerElement && currentWidget.constructorName && window[currentWidget.constructorName]) {
    //             new (window as any)[currentWidget.constructorName](containerElement, constructorOption);
    //         } else {
    //             console.error(
    //                 `Widget with ID:${ID} has no constructorName from ${api}:${currentWidget.constructorName}`
    //             );
    //         }
    //     };
    //     document.body.appendChild(script);
    // };

    const getClass = (): string =>
        !draggable && widgetState.type === 'info'
            ? ''
            : 'cursor-pointer hover:brightness-110';

    return (
        <div
            id={ID}
            className={`transition rounded-md w-full h-full ${getClass()} ${draggable ? 'widget-flexible--flex' : ''}`}
            style={{backgroundColor: widgetState.backgroundColor}}
            onClick={widgetAction}
            ref={widgetRef}
        >
            <div className="text-amber-50 flex flex-col justify-between gap-2.5 p-3 w-full h-full">
                <div>
                    <span className="font-bold">{widgetState.name}</span>
                    <p className="text-sm">{widgetState.description}</p>
                </div>
                <div className="flex items-end justify-between gap-5">
                    {widgetState.type === 'info' && <div>{widgetState.info}</div>}
                    {widgetState.type === 'switcher' && (
                        <span className="text-lg font-bold">
              {widgetState.state ? 'ON' : 'OFF'}
            </span>
                    )}
                    <span className="admin-widgets__icon">
                        <MaterialIcon name={widgetState.icon}/>
          </span>
                </div>
            </div>
        </div>
    );
};

export default WidgetItem;
