import React from "react";
import {NodeModel} from "@minoru/react-dnd-treeview";
import styles from "@/components/catalog/catalogUI/CatalogNode.module.css";
import {ChevronRight, LoaderCircle} from "lucide-react";
import {CustomCatalogData} from "@/types";
import MaterialIcon from "@/components/material-icon.tsx";

type Props = {
    node: NodeModel<CustomCatalogData>;
    depth: number;
    isOpen: boolean;
    isSelected: boolean;
    onToggle: (id: NodeModel["id"]) => void;
    loading: boolean;
    onSelect: (node: NodeModel<CustomCatalogData>) => void;
};

const CatalogNode: React.FC<Props> = (props) => {
    // const { droppable, data } = props.node;
    const indent = props.depth * 24;

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        props.onToggle(props.node.id);
    };

    const handleSelect = () => props.onSelect(props.node);

    return (
        <div
            className={`tree-node ${styles.root} ${
                props.isSelected ? styles.isSelected : ""
            }`}
            style={{paddingInlineStart: indent}}
            onClick={handleSelect}
        >
            <div
                className={`${styles.expandIconWrapper} ${
                    props.isOpen ? styles.isOpen : ""
                }`}
            >
                {props.node.droppable && (
                    <div onClick={handleToggle}>
                        <ChevronRight size={18}/>
                    </div>
                )}
            </div>
            <MaterialIcon name={props.node.data?.icon ?? "folder"}/>
            <div className={styles.labelGridItem}>
                <span>{props.node.text}</span>
            </div>
            {props.loading && <LoaderCircle
                className="size-4 animate-spin"/>}
        </div>
    );
};

export default CatalogNode;
