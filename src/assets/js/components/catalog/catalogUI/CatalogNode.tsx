import React, {useEffect} from "react";
import {NodeModel} from "@minoru/react-dnd-treeview";
import styles from "@/components/catalog/catalogUI/CatalogNode.module.css";
import {ChevronRight, Eye, EyeOff, LoaderCircle} from "lucide-react";
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

    useEffect(() => {
        console.log(props.node)
    }, []);
    const handleSelect = () => props.onSelect(props.node);

    return (
        <div
            className={`tree-node ${styles.root} ${props.isSelected ? styles.isSelected : ""} ${props.node.data?.marked ? 'bg-gray-200' : ""}`}
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
            <div className="flex items-center gap-2">
                {props.node.data?.isNavigation &&
                    (props.node.data?.visible ? (<Eye className="size-5"/>) : (<EyeOff className="size-5"/>) )}
                <MaterialIcon name={props.node.data?.icon ?? "folder"}/>
            </div>
            <div className={styles.labelGridItem}>
                <span>{props.node.text}</span>
            </div>
            {props.loading && <LoaderCircle
                className="size-4 animate-spin"/>}
        </div>
    );
};

export default CatalogNode;
