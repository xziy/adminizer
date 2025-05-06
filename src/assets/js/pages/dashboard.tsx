import AppLayout from '@/layouts/app-layout';
import {type BreadcrumbItem} from '@/types';
import {Responsive, WidthProvider} from "react-grid-layout";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {useMemo, useState} from "react";

const breadcrumbs: BreadcrumbItem[] = [];

const initialLayout = [
    {x: 0, y: 0, w: 1, h: 1, i: "1111"},
    {x: 1, y: 0, w: 2, h: 1, i: "2222"},
    {x: 4, y: 0, w: 1, h: 2, i: "3333"},
];

export default function Dashboard() {
    const [layout, setLayout] = useState(initialLayout);
    const ResponsiveGridLayout = useMemo(() => WidthProvider(Responsive), []);

    const handleLayoutChange = (currentLayout: any) => {
        setLayout(currentLayout);
        console.log("Updated layout:", currentLayout);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                Dashboard
                <div>
                    <ResponsiveGridLayout
                        layouts={{lg: layout}}
                        breakpoints={{lg: 1024, md: 768, sm: 475, xs: 320, xxs: 0}}
                        cols={{lg: 8, md: 6, sm: 4, xs: 2, xxs: 2}}
                        rowHeight={131}
                        onLayoutChange={handleLayoutChange}
                        isResizable={false}
                        isDraggable={true}
                    >
                        {layout.map(({i}) => (
                            <div key={i} className="block" style={{background: "#f0f0f0"}}>
                                {i}
                            </div>
                        ))}
                    </ResponsiveGridLayout>
                </div>
                <div>
                    <h3>Current Layout:</h3>
                    <pre>{JSON.stringify(layout, null, 2)}</pre>
                </div>
            </div>
        </AppLayout>
    );
}
