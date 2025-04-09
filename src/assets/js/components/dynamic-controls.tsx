import React, {FC, useState, useEffect} from "react";

export interface ComponentType {
    default: FC<{
        options?: Record<string, string>
        initialValue: string
        onChange?: (value: string) => void
    }>;
}

interface Props {
    moduleComponent: string;
    options?: Record<string, string>
    initialValue: string
    onChange: (value: string) => void
}

export default function DynamicControls({moduleComponent, initialValue, onChange}: Props) {
    const [Component, setComponent] = useState<React.ReactElement | null>(null);

    useEffect(() => {
        const initModule = async () => {
            // const Module = await import(/* @vite-ignore */ moduleComponent as string);
            const Module = await import(/* @vite-ignore */ moduleComponent as string);
            const Component = Module.default as ComponentType['default'];
            setComponent(<Component initialValue={initialValue} onChange={onChange}/>);
        }
        initModule();
    }, [initialValue])


    return (
        <>
            {Component || null}
        </>
    )
}
