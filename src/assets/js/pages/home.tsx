import {Head, Link, usePage} from "@inertiajs/react";
import React, {FC, useState} from "react";

interface Controls {
    component: string;
    props: {
        message: string;
    };
}

export interface ComponentType {
    default: FC<{ message?: string }>;
}

export default function Home() {
    const page = usePage();

    const [Component, setComponent] = useState<React.ReactElement | null>(null);
    const [Component2, setComponent2] = useState<React.ReactElement | null>(null);

    const componentData = page.props.controls as Controls[];

    const handleLoadComponent = async () => {
        const {component, props} = componentData[0];
        const Module = await import(`../components/${component}.tsx`);
        const Component = Module.default as ComponentType['default'];
        setComponent(<Component {...props} />);
    };

    const handleLoadComponent2 = async () => {
        const {component} = componentData[1];
        const Module = await import(/* @vite-ignore */ component);
        const Component2 = Module.default as ComponentType['default'];
        setComponent2(<Component2 {...{message: "Hello from Component B"}} />);
    };

    return (
        <>
            <Head title="Home"/>
            <div>
                <Link
                    href="/page"
                >
                    Page
                </Link>
            </div>
            <div>
                <h1>Is Home</h1>
            </div>
            <div>
                <button onClick={handleLoadComponent}>Загрузить компонент</button>
                <p></p>
                {Component || <p>Нажмите кнопку, чтобы загрузить компонент</p>}
            </div>
            <p></p>
            <div>
                <button onClick={handleLoadComponent2}>Загрузить компонент</button>
                <p></p>
                {Component2 || <p>Нажмите кнопку, чтобы загрузить компонент</p>}
            </div>
        </>
    )
}
