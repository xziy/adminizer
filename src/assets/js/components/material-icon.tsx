import {cn} from "@/lib/utils.ts";
import React from "react";

interface MaterialIconProps {
    name: string;
    className?: string;
    style?: React.CSSProperties;
}

export default function MaterialIcon({ name, className, style }: MaterialIconProps) {
    return <span className={cn('material-icons-outlined', className)} style={style}>{name}</span>
}
