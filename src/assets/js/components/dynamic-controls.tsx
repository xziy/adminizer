import React, {FC, useState, useEffect, useCallback} from "react";

export interface ComponentType {
    default: FC<{
        options?: Record<string, string>
        initialValue: string
        onChange?: (value: string) => void
        name: string
    }>;
}

interface Props {
    moduleComponent: string;
    options?: Record<string, string>
    initialValue: string
    onChange: (value: any) => void
    name: string
}

export default function DynamicControls({moduleComponent, initialValue, onChange, name}: Props) {
    const [Component, setComponent] = useState<React.ReactElement | null>(null);

    const memoizedOnChange = useCallback(onChange, []);

    useEffect(() => {
        const initModule = async () => {
            const Module = await import(/* @vite-ignore */ moduleComponent as string);
            const Component = Module.default as ComponentType['default'];
            setComponent(
                <Component
                    initialValue={initialValue}
                    onChange={memoizedOnChange}
                    name={name}
                />
            );
        }
        initModule();
    }, [initialValue, moduleComponent, memoizedOnChange])

    return Component
}
