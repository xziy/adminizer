import React from "react";
import { DragLayerMonitorProps } from "@minoru/react-dnd-treeview";
import styles from "@/components/catalog/catalogUI/CatalogDragPreview.module.css";
import {CustomCatalogData} from "@/types";
import MaterialIcon from "@/components/material-icon.tsx";

type Props = {
    monitorProps: DragLayerMonitorProps<CustomCatalogData>;
};

const CatalogDragPreview: React.FC<Props> = (props) => {
    const item = props.monitorProps.item;

    return (
        <div className={`${styles.root} bg-chart-1/60`}>
            <div className={styles.icon}>
                <MaterialIcon name={item.data?.icon ?? "folder"}/>
            </div>
            <div className={styles.label}>{item.text}</div>
        </div>
    );
};
export default CatalogDragPreview;
